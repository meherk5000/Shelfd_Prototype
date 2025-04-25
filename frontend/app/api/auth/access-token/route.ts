import { getAccessToken, withApiAuthRequired } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';

// Define the handler using withApiAuthRequired to ensure user is logged in
const GET = withApiAuthRequired(async function GET(req) {
  try {
    // Get the access token for the logged-in user
    // Specify audience and scopes if needed for your backend API
    const { accessToken } = await getAccessToken(req, new NextResponse(), {
      // scopes: ['read:reviews', 'write:reviews'], // Example scopes
      // audience: process.env.AUTH0_AUDIENCE // Ensure AUTH0_AUDIENCE is set in .env.local if needed
    });

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token not found' }, { status: 401 });
    }

    return NextResponse.json({ accessToken });
  } catch (error: any) {
    console.error("Error getting access token:", error);
    return NextResponse.json({ error: error.message || 'Failed to get access token' }, { status: error.status || 500 });
  }
});

export { GET }; 