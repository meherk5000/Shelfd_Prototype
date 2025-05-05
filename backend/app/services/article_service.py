"""
Article Service for Shelfd API

This module handles all functionality related to articles in the Shelfd application:
1. Fetching articles from external RSS feeds (New Yorker, Atlantic, Aeon)
2. Processing and storing article data in MongoDB
3. Searching and retrieving articles for the frontend
4. Estimating article read times

The service runs as a background task to keep articles updated without blocking user requests.
"""

import feedparser
from datetime import datetime
from pymongo import MongoClient
from config import settings
import hashlib
import re
from bs4 import BeautifulSoup
import asyncio
import httpx
import traceback

class ArticleService:
    """
    Service class handling article-related operations
    
    This class provides methods for fetching, storing, and retrieving articles
    from various online publications. It uses RSS feeds as the primary data source
    and stores processed articles in MongoDB.
    """
    
    # Define RSS feed sources with their URLs
    # These are the publication sources we'll fetch articles from
    RSS_FEEDS = {
        "newyorker": "https://www.newyorker.com/feed/everything",
        "atlantic": "https://www.theatlantic.com/feed/all/",
        "aeon": "https://aeon.co/feed.rss"
    }

    @staticmethod
    def get_mongo_client():
        """
        Create and return a MongoDB client with proper SSL configuration
        
        This method configures the MongoDB connection with TLS/SSL settings
        required by most cloud MongoDB providers (like MongoDB Atlas).
        
        Returns:
            MongoClient: Configured MongoDB client instance
        """
        return MongoClient(
            settings.mongodb_url,
            serverSelectionTimeoutMS=5000,  # Timeout for server selection
            tls=True,                       # Enable TLS/SSL
            tlsAllowInvalidCertificates=True  # Allow self-signed certificates in dev environments
        )

    @classmethod
    async def fetch_and_store_articles(cls):
        """
        Fetch articles from RSS feeds and store them in MongoDB
        
        This is the main worker method that:
        1. Connects to MongoDB
        2. Sets up required indexes
        3. Fetches articles from all configured RSS feeds
        4. Processes article content (extracting images, cleaning HTML, etc.)
        5. Stores new articles in the database
        
        This method is designed to run as a background task at regular intervals.
        
        Returns:
            dict: Statistics about the fetching process (total articles, new articles)
        
        Raises:
            Exception: If there's a critical error in the fetching process
        """
        print("Starting fetch_and_store_articles...")
        try:
            # Connect to MongoDB
            client = cls.get_mongo_client()
            print("MongoDB client created successfully")
            db = client[settings.MONGODB_NAME]
            collection = db["articles"]
            
            # Test MongoDB connection
            print("Testing MongoDB connection...")
            db_list = client.list_database_names()
            print(f"Available databases: {db_list}")
            
            # Create text index for full-text search capabilities
            # This enables efficient searching of article content
            try:
                print("Creating text index...")
                collection.create_index([("title", "text"), ("summary", "text"), ("source", "text")])
                print("Text index created successfully")
            except Exception as e:
                print(f"Error creating text index: {str(e)}")
            
            # Track statistics
            all_articles = []
            new_count = 0

            # Process each RSS feed source
            for source, url in cls.RSS_FEEDS.items():
                try:
                    print(f"Fetching articles from {source}: {url}")
                    
                    # Use httpx for async HTTP requests to fetch feed content
                    # This is more efficient than synchronous requests
                    async with httpx.AsyncClient() as client:
                        response = await client.get(url, timeout=30.0)
                        if response.status_code != 200:
                            print(f"Error fetching feed from {url}, status code: {response.status_code}")
                            continue
                        
                        # Parse the feed content with feedparser
                        feed_content = response.text
                        feed = feedparser.parse(feed_content)
                    
                    # Validate feed structure
                    if not hasattr(feed, 'entries') or not feed.entries:
                        print(f"No entries found in feed for {source}. Feed structure: {feed.keys()}")
                        continue
                    
                    print(f"Feed parsed successfully for {source}. Found {len(feed.entries)} entries.")
                    
                    # Process each article in the feed
                    for entry in feed.entries:
                        try:
                            # Debug information about entry structure
                            print(f"Entry keys: {entry.keys()}")
                            
                            # Validate essential fields
                            if not hasattr(entry, 'link') or not entry.link:
                                print(f"Skipping entry without link: {entry.get('title', 'Unknown title')}")
                                continue
                                
                            if not hasattr(entry, 'title') or not entry.title:
                                print(f"Skipping entry without title for link: {entry.link}")
                                continue
                            
                            # Create a consistent ID based on article URL
                            # This ensures we don't store duplicates if the URL stays the same
                            article_id = hashlib.md5(entry.link.encode()).hexdigest()
                            print(f"Processing article: {entry.title} (ID: {article_id})")
                            
                            # Extract metadata from the feed entry
                            image_url = cls._extract_image(entry)
                            content = cls._extract_content(entry)
                            tags = cls._extract_tags(entry)
                            
                            # Create structured article object
                            article = {
                                "_id": article_id,
                                "type": "article",
                                "source": source,
                                "source_name": cls._get_source_name(source),
                                "title": entry.title,
                                "url": entry.link,
                                "published_date": entry.get("published", entry.get("pubDate", "")),
                                "summary": cls._clean_html(entry.get("summary", entry.get("description", ""))),
                                "content": content,
                                "author": entry.get("author", entry.get("creator", "Unknown")),
                                "image_url": image_url,
                                "tags": tags,
                                "updated": datetime.now().isoformat()
                            }
                            
                            # Debug article object
                            print(f"Created article object with title: {article['title']}")
                            print(f"Image URL: {article['image_url']}")
                            
                            # Store in MongoDB (only if it doesn't already exist)
                            try:
                                existing = collection.find_one({"_id": article_id})
                                if not existing:
                                    print(f"Inserting new article: {article['title']}")
                                    collection.insert_one(article)
                                    new_count += 1
                                    print(f"Added new article: {article['title']}")
                                else:
                                    print(f"Article already exists: {article['title']}")
                                all_articles.append(article)
                            except Exception as mongo_error:
                                print(f"MongoDB error for article {article_id}: {str(mongo_error)}")
                                traceback.print_exc()
                        except Exception as entry_error:
                            print(f"Error processing entry in {source}: {str(entry_error)}")
                            traceback.print_exc()
                except Exception as e:
                    print(f"Error fetching from {source}: {str(e)}")
                    traceback.print_exc()
            
            print(f"Fetch complete. Total articles: {len(all_articles)}, New articles: {new_count}")
            return {"total": len(all_articles), "new": new_count}
        except Exception as main_error:
            print(f"Major error in fetch_and_store_articles: {str(main_error)}")
            traceback.print_exc()
            raise main_error
    
    @staticmethod
    def _extract_image(entry):
        """
        Extract image URL from a feed entry
        
        This method tries multiple possible locations for image data in feed entries,
        as different RSS feeds structure their data differently.
        
        Args:
            entry: A feedparser entry object
            
        Returns:
            str: URL of the article's image, or None if no image is found
        """
        # Try media:thumbnail
        if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
            return entry.media_thumbnail[0].get('url')
        
        # Try media_thumbnail attribute
        if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
            if isinstance(entry.media_thumbnail, list) and len(entry.media_thumbnail) > 0:
                return entry.media_thumbnail[0].get('url')
        
        # Try media_content
        if hasattr(entry, 'media_content') and entry.media_content:
            for media in entry.media_content:
                if media.get('medium') == 'image':
                    return media.get('url')
        
        # Try enclosures
        if hasattr(entry, 'enclosures') and entry.enclosures:
            for enclosure in entry.enclosures:
                if enclosure.get('type', '').startswith('image/'):
                    return enclosure.get('href')
        
        # Try to extract from content HTML
        if hasattr(entry, 'content') and entry.content:
            content = entry.content[0].value
            soup = BeautifulSoup(content, 'html.parser')
            img = soup.find('img')
            if img and img.get('src'):
                return img['src']
        
        # Try to extract from summary HTML
        if hasattr(entry, 'summary') and entry.summary:
            soup = BeautifulSoup(entry.summary, 'html.parser')
            img = soup.find('img')
            if img and img.get('src'):
                return img['src']
                
        # Try to extract from description HTML
        if hasattr(entry, 'description') and entry.description:
            soup = BeautifulSoup(entry.description, 'html.parser')
            img = soup.find('img')
            if img and img.get('src'):
                return img['src']
        
        # No image found
        return None
    
    @staticmethod
    def _extract_content(entry):
        """
        Extract the full article content from a feed entry
        
        This tries various possible locations for the main content,
        with fallbacks from most detailed to least detailed.
        
        Args:
            entry: A feedparser entry object
            
        Returns:
            str: Full content of the article, or empty string if none found
        """
        if hasattr(entry, 'content') and entry.content:
            return entry.content[0].value
        if hasattr(entry, 'summary') and entry.summary:
            return entry.summary
        if hasattr(entry, 'description') and entry.description:
            return entry.description
        return ''
    
    @staticmethod
    def _extract_tags(entry):
        """
        Extract tags/categories from a feed entry
        
        This tries various possible locations for tags or categories,
        as different feeds use different fields for categorization.
        
        Args:
            entry: A feedparser entry object
            
        Returns:
            list: List of tag strings
        """
        tags = []
        
        # Try regular tags
        if hasattr(entry, 'tags') and entry.tags:
            for tag in entry.tags:
                if hasattr(tag, 'term') and tag.term:
                    tags.append(tag.term)
        
        # Try categories
        if hasattr(entry, 'categories'):
            for category in entry.categories:
                if isinstance(category, str):
                    tags.append(category)
                elif hasattr(category, 'term'):
                    tags.append(category.term)
        
        # Try category as string
        if hasattr(entry, 'category') and isinstance(entry.category, str):
            tags.append(entry.category)
            
        # Try media:keywords
        if hasattr(entry, 'media_keywords') and entry.media_keywords:
            keywords = entry.media_keywords.split(',')
            tags.extend([k.strip() for k in keywords])
            
        return tags
    
    @staticmethod
    def _clean_html(html_text):
        """
        Remove HTML tags from text content
        
        Uses BeautifulSoup to properly parse and extract plain text
        from HTML content, handling entities and nested tags correctly.
        
        Args:
            html_text: HTML content as string
            
        Returns:
            str: Plain text content without HTML tags
        """
        if not html_text:
            return ""
        soup = BeautifulSoup(html_text, 'html.parser')
        return soup.get_text()
    
    @staticmethod
    def _get_source_name(source_key):
        """
        Convert source key to a readable publication name
        
        Maps internal source identifiers to proper publication names
        for display to users.
        
        Args:
            source_key: Internal source identifier (e.g., "newyorker")
            
        Returns:
            str: Formatted publication name (e.g., "The New Yorker")
        """
        names = {
            "newyorker": "The New Yorker",
            "atlantic": "The Atlantic",
            "aeon": "Aeon"
        }
        return names.get(source_key, source_key.capitalize())
    
    @classmethod
    async def search_articles(cls, query, limit=5):
        """
        Search for articles in MongoDB using text search
        
        This uses MongoDB's text search capabilities to find
        articles matching the query in title, summary, or source.
        
        Args:
            query: Search query string
            limit: Maximum number of results to return (default 5)
            
        Returns:
            list: Articles matching the search query, formatted for the frontend
        """
        client = cls.get_mongo_client()
        db = client[settings.MONGODB_NAME]
        collection = db["articles"]
        
        if query and len(query) >= 2:
            # Use MongoDB's text search with scoring
            # This searches across all fields with a text index
            # and sorts by relevance to the query
            results = list(collection.find(
                {"$text": {"$search": query}},
                {"score": {"$meta": "textScore"}}
            ).sort([("score", {"$meta": "textScore"})]).limit(limit))
        else:
            # Return recent articles if no query or query too short
            results = list(collection.find().sort("published_date", -1).limit(limit))
        
        # Format results for search API response
        # This transforms MongoDB documents into the structure expected by the frontend
        return [
            {
                "id": article["_id"],
                "title": article["title"],
                "subtitle": article["source_name"],
                "image_url": article["image_url"],
                "type": "article"
            }
            for article in results
        ]
    
    @classmethod
    async def get_article(cls, article_id):
        """
        Get a specific article by ID
        
        Retrieves full article details from MongoDB and formats them
        for the frontend article detail view.
        
        Args:
            article_id: The unique ID of the article to retrieve
            
        Returns:
            dict: Complete article data or None if not found
        """
        client = cls.get_mongo_client()
        db = client[settings.MONGODB_NAME]
        collection = db["articles"]
        
        article = collection.find_one({"_id": article_id})
        
        if not article:
            # If not found, return None
            return None
        
        # Format article for API response
        # This includes all fields needed for the article detail page
        return {
            "id": article["_id"],
            "title": article["title"],
            "author": article.get("author", "Unknown Author"),
            "source": article["source_name"],
            "image_url": article.get("image_url"),
            "publication_date": article.get("published_date", ""),
            "content": article.get("content", ""),
            "description": article.get("summary", ""),
            "url": article["url"],
            "tags": article.get("tags", []),
            "type": "article"
        }
        
    @classmethod
    async def get_recent_articles(cls, limit=8):
        """
        Get recent articles for the explore page
        
        Retrieves the most recently published articles and formats them
        for display on the explore/discover section of the frontend.
        
        Args:
            limit: Maximum number of articles to return (default 8)
            
        Returns:
            list: Recent articles formatted for the frontend
        """
        client = cls.get_mongo_client()
        db = client[settings.MONGODB_NAME]
        collection = db["articles"]
        
        # Find most recent articles, sorted by publication date
        results = list(collection.find().sort("published_date", -1).limit(limit))
        
        # Format results for explore page
        # This includes additional fields like estimated read time
        return [
            {
                "id": article["_id"],
                "title": article["title"],
                "author": article.get("author", "Unknown Author"),
                "source": article["source_name"],
                "image_url": article.get("image_url"),
                "description": article.get("summary", ""),
                "tags": article.get("tags", []),
                "published_date": article.get("published_date", ""),
                "read_time": cls._estimate_read_time(article.get("content", "")),
                "type": "article"
            }
            for article in results
        ]
    
    @staticmethod
    def _estimate_read_time(content):
        """
        Estimate article read time based on content length
        
        Uses an average reading speed of 200 words per minute to
        calculate an estimated reading time for the article.
        
        Args:
            content: The article content as text
            
        Returns:
            str: Formatted read time (e.g., "5 min read")
        """
        if not content:
            return "5 min read"
        
        # Average reading speed is about 200-250 words per minute
        words = len(content.split())
        minutes = max(1, round(words / 200))
        
        if minutes == 1:
            return "1 min read"
        else:
            return f"{minutes} min read" 