import express from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const router = express.Router();
const prisma = new PrismaClient();

const FB_CLIENT_ID = process.env.FB_CLIENT_ID;
const FB_CLIENT_SECRET = process.env.FB_CLIENT_SECRET;
const FB_REDIRECT_URI = process.env.FB_REDIRECT_URI || 'http://localhost:4000/api/auth/facebook/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Start OAuth flow
router.get('/facebook', (req, res) => {
  const fbAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FB_CLIENT_ID}&redirect_uri=${FB_REDIRECT_URI}&scope=ads_management,ads_read,business_management`;
  res.redirect(fbAuthUrl);
});

// Callback from OAuth
router.get('/facebook/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Code not provided' });
  }

  try {
    // 1. Exchange code for short-lived access token
    const tokenResponse = await axios.get(`https://graph.facebook.com/v18.0/oauth/access_token`, {
      params: {
        client_id: FB_CLIENT_ID,
        redirect_uri: FB_REDIRECT_URI,
        client_secret: FB_CLIENT_SECRET,
        code
      }
    });

    const shortLivedToken = tokenResponse.data.access_token;

    // 2. Exchange short-lived for long-lived access token
    const longLivedResponse = await axios.get(`https://graph.facebook.com/v18.0/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: FB_CLIENT_ID,
        client_secret: FB_CLIENT_SECRET,
        fb_exchange_token: shortLivedToken
      }
    });

    const longLivedToken = longLivedResponse.data.access_token;
    
    // 3. Get User ID
    const meResponse = await axios.get(`https://graph.facebook.com/me?access_token=${longLivedToken}`);
    const userId = meResponse.data.id;

    // 4. Save/Update in DB
    await prisma.metaOAuthConfig.upsert({
      where: { userId },
      update: {
        accessToken: longLivedToken,
        updatedAt: new Date()
      },
      create: {
        userId,
        accessToken: longLivedToken
      }
    });

    res.redirect(`${FRONTEND_URL}/integrations?success=true`);
  } catch (error) {
    console.error('FB Auth Error', error.response?.data || error.message);
    res.redirect(`${FRONTEND_URL}/integrations?error=auth_failed`);
  }
});

// Get current linked account connection status
router.get('/facebook/status', async (req, res) => {
  try {
    const config = await prisma.metaOAuthConfig.findFirst();
    if (config) {
      return res.json({ connected: true, userId: config.userId, updatedAt: config.updatedAt });
    }
    return res.json({ connected: false });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
