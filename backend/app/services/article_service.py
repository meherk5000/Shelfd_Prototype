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
    RSS_FEEDS = {
        "newyorker": "https://www.newyorker.com/feed/everything",
        "atlantic": "https://www.theatlantic.com/feed/all/",
        "aeon": "https://aeon.co/feed.rss"
    }

    @staticmethod
    def get_mongo_client():
        """Get MongoDB client with SSL settings"""
        return MongoClient(
            settings.mongodb_url,
            serverSelectionTimeoutMS=5000,
            tls=True,
            tlsAllowInvalidCertificates=True
        )

    @classmethod
    async def fetch_and_store_articles(cls):
        """Fetch articles from RSS feeds and store in MongoDB"""
        print("Starting fetch_and_store_articles...")
        try:
            client = cls.get_mongo_client()
            print("MongoDB client created successfully")
            db = client[settings.MONGODB_NAME]
            collection = db["articles"]
            
            # Test MongoDB connection
            print("Testing MongoDB connection...")
            db_list = client.list_database_names()
            print(f"Available databases: {db_list}")
            
            # Ensure we have a text index for searching
            try:
                print("Creating text index...")
                collection.create_index([("title", "text"), ("summary", "text"), ("source", "text")])
                print("Text index created successfully")
            except Exception as e:
                print(f"Error creating text index: {str(e)}")
            
            all_articles = []
            new_count = 0

            for source, url in cls.RSS_FEEDS.items():
                try:
                    print(f"Fetching articles from {source}: {url}")
                    
                    # Use httpx to fetch the feed content first
                    async with httpx.AsyncClient() as client:
                        response = await client.get(url, timeout=30.0)
                        if response.status_code != 200:
                            print(f"Error fetching feed from {url}, status code: {response.status_code}")
                            continue
                        
                        # Parse the feed content
                        feed_content = response.text
                        feed = feedparser.parse(feed_content)
                    
                    # Check if feed contains entries
                    if not hasattr(feed, 'entries') or not feed.entries:
                        print(f"No entries found in feed for {source}. Feed structure: {feed.keys()}")
                        continue
                    
                    print(f"Feed parsed successfully for {source}. Found {len(feed.entries)} entries.")
                    
                    for entry in feed.entries:
                        try:
                            # Print the entry keys to debug
                            print(f"Entry keys: {entry.keys()}")
                            
                            # Make sure essential fields exist
                            if not hasattr(entry, 'link') or not entry.link:
                                print(f"Skipping entry without link: {entry.get('title', 'Unknown title')}")
                                continue
                                
                            if not hasattr(entry, 'title') or not entry.title:
                                print(f"Skipping entry without title for link: {entry.link}")
                                continue
                            
                            # Generate a unique ID based on article URL
                            article_id = hashlib.md5(entry.link.encode()).hexdigest()
                            print(f"Processing article: {entry.title} (ID: {article_id})")
                            
                            # Extract image if available
                            image_url = cls._extract_image(entry)
                            
                            # Extract content
                            content = cls._extract_content(entry)
                            
                            # Extract tags/categories
                            tags = cls._extract_tags(entry)
                            
                            # Create article object
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
                            
                            # Check if article already exists
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
        """Extract image URL from feed entry"""
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
        
        # Try to extract from content
        if hasattr(entry, 'content') and entry.content:
            content = entry.content[0].value
            soup = BeautifulSoup(content, 'html.parser')
            img = soup.find('img')
            if img and img.get('src'):
                return img['src']
        
        # Try to extract from summary
        if hasattr(entry, 'summary') and entry.summary:
            soup = BeautifulSoup(entry.summary, 'html.parser')
            img = soup.find('img')
            if img and img.get('src'):
                return img['src']
                
        # Try to extract from description
        if hasattr(entry, 'description') and entry.description:
            soup = BeautifulSoup(entry.description, 'html.parser')
            img = soup.find('img')
            if img and img.get('src'):
                return img['src']
        
        # Default placeholder
        return None
    
    @staticmethod
    def _extract_content(entry):
        """Extract the full content from entry"""
        if hasattr(entry, 'content') and entry.content:
            return entry.content[0].value
        if hasattr(entry, 'summary') and entry.summary:
            return entry.summary
        if hasattr(entry, 'description') and entry.description:
            return entry.description
        return ''
    
    @staticmethod
    def _extract_tags(entry):
        """Extract tags/categories from entry"""
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
        """Clean HTML tags from text"""
        if not html_text:
            return ""
        soup = BeautifulSoup(html_text, 'html.parser')
        return soup.get_text()
    
    @staticmethod
    def _get_source_name(source_key):
        """Convert source key to readable name"""
        names = {
            "newyorker": "The New Yorker",
            "atlantic": "The Atlantic",
            "aeon": "Aeon"
        }
        return names.get(source_key, source_key.capitalize())
    
    @classmethod
    async def search_articles(cls, query, limit=5):
        """Search for articles in MongoDB"""
        client = cls.get_mongo_client()
        db = client[settings.MONGODB_NAME]
        collection = db["articles"]
        
        if query and len(query) >= 2:
            # Use a text search with sorting by score
            results = list(collection.find(
                {"$text": {"$search": query}},
                {"score": {"$meta": "textScore"}}
            ).sort([("score", {"$meta": "textScore"})]).limit(limit))
        else:
            # Return recent articles if no query
            results = list(collection.find().sort("published_date", -1).limit(limit))
        
        # Format results for search
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
        """Get a specific article by ID"""
        client = cls.get_mongo_client()
        db = client[settings.MONGODB_NAME]
        collection = db["articles"]
        
        article = collection.find_one({"_id": article_id})
        
        if not article:
            # If not found, return None
            return None
        
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
        """Get recent articles for the explore page"""
        client = cls.get_mongo_client()
        db = client[settings.MONGODB_NAME]
        collection = db["articles"]
        
        # Find most recent articles
        results = list(collection.find().sort("published_date", -1).limit(limit))
        
        # Format results for explore page
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
        """Estimate article read time based on content length"""
        if not content:
            return "5 min read"
        
        # Average reading speed is about 200-250 words per minute
        words = len(content.split())
        minutes = max(1, round(words / 200))
        
        if minutes == 1:
            return "1 min read"
        else:
            return f"{minutes} min read" 