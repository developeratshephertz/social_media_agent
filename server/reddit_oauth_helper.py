#!/usr/bin/env python3
"""
Reddit OAuth Helper Script
Helps you get the proper OAuth scopes for Reddit API access
"""

import os
import requests
import urllib.parse
import webbrowser
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class RedditOAuthHelper:
    def __init__(self):
        # Use new Reddit app credentials
        self.client_id = '5Q0cVmGsMT6uUICAHBMiFw'
        self.client_secret = 'U-TtX1_P0yoU6zd_ygvRSAbnEHM7vw'
        self.redirect_uri = 'http://localhost:5173/dashboard'
        self.user_agent = 'shephertz/1.0'
        
        # All the scopes we need
        self.scopes = [
            'identity',      # Get account info (username, karma, etc.)
            'read',          # Read posts and comments
            'history',       # Access voting/browsing history
            'submit',        # Create posts and comments
            'mysubreddits'   # Access subscribed subreddits
        ]
    
    def generate_auth_url(self):
        """Generate the Reddit OAuth authorization URL with all required scopes"""
        
        # Base Reddit OAuth URL
        base_url = "https://www.reddit.com/api/v1/authorize"
        
        # Parameters
        params = {
            'client_id': self.client_id,
            'response_type': 'code',
            'state': 'reddit_oauth_flow',
            'redirect_uri': self.redirect_uri,
            'duration': 'permanent',  # Get permanent token
            'scope': ' '.join(self.scopes)  # All scopes space-separated
        }
        
        # Build the URL
        auth_url = f"{base_url}?{urllib.parse.urlencode(params)}"
        
        return auth_url
    
    def exchange_code_for_token(self, code):
        """Exchange authorization code for access token"""
        
        # Reddit token endpoint
        token_url = "https://www.reddit.com/api/v1/access_token"
        
        # Headers
        headers = {
            'User-Agent': self.user_agent,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        
        # Data for token exchange
        data = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': self.redirect_uri
        }
        
        # Basic auth for client credentials - Reddit requires this specific format
        import base64
        credentials = f"{self.client_id}:{self.client_secret}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()
        headers['Authorization'] = f'Basic {encoded_credentials}'
        
        try:
            response = requests.post(token_url, headers=headers, data=data)
            response.raise_for_status()
            
            token_data = response.json()
            return {
                'success': True,
                'access_token': token_data.get('access_token'),
                'refresh_token': token_data.get('refresh_token'),
                'expires_in': token_data.get('expires_in'),
                'scopes': token_data.get('scope', '').split(),
                'token_type': token_data.get('token_type')
            }
            
        except requests.exceptions.RequestException as e:
            print(f"Error exchanging code for token: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"Response: {e.response.text}")
            return {'success': False, 'error': str(e)}
    
    def update_env_file(self, access_token, refresh_token):
        """Update the .env file with new tokens"""
        env_file = '.env'
        
        # Read current .env file
        try:
            with open(env_file, 'r') as f:
                lines = f.readlines()
        except FileNotFoundError:
            print(f"❌ .env file not found at {env_file}")
            return False
        
        # Update or add tokens
        updated = False
        new_lines = []
        
        for line in lines:
            if line.startswith('REDDIT_ACCESS_TOKEN='):
                new_lines.append(f'REDDIT_ACCESS_TOKEN={access_token}\n')
                updated = True
            elif line.startswith('REDDIT_REFRESH_TOKEN='):
                new_lines.append(f'REDDIT_REFRESH_TOKEN={refresh_token}\n')
                updated = True
            else:
                new_lines.append(line)
        
        # Add tokens if they weren't found
        if not updated:
            new_lines.append(f'REDDIT_ACCESS_TOKEN={access_token}\n')
            new_lines.append(f'REDDIT_REFRESH_TOKEN={refresh_token}\n')
        
        # Write back to file
        try:
            with open(env_file, 'w') as f:
                f.writelines(new_lines)
            return True
        except Exception as e:
            print(f"❌ Error updating .env file: {e}")
            return False
    
    def test_token(self, access_token):
        """Test the access token by calling Reddit API"""
        
        headers = {
            'Authorization': f'Bearer {access_token}',
            'User-Agent': self.user_agent
        }
        
        # Test with /api/v1/me endpoint
        test_url = "https://oauth.reddit.com/api/v1/me"
        
        try:
            response = requests.get(test_url, headers=headers)
            response.raise_for_status()
            
            user_data = response.json()
            print("✅ Token test successful!")
            print(f"Username: {user_data.get('name')}")
            print(f"Account created: {user_data.get('created_utc')}")
            print(f"Karma: {user_data.get('total_karma')}")
            
            return True
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Token test failed: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"Response: {e.response.text}")
            return False
    
    def run_oauth_flow(self):
        """Run the complete OAuth flow"""
        
        print("🔗 Reddit OAuth Helper")
        print("=" * 50)
        print(f"Client ID: {self.client_id}")
        print(f"Redirect URI: {self.redirect_uri}")
        print(f"Required scopes: {', '.join(self.scopes)}")
        print()
        
        # Generate and display auth URL
        auth_url = self.generate_auth_url()
        print("📋 Step 1: Authorization URL")
        print("-" * 30)
        print(auth_url)
        print()
        
        # Open browser automatically
        print("🌐 Opening browser for Reddit authorization...")
        webbrowser.open(auth_url)
        print()
        
        # Get authorization code from user
        print("📝 Step 2: Get Authorization Code")
        print("-" * 30)
        print("1. Complete the authorization in your browser")
        print("2. You'll be redirected to your dashboard")
        print("3. Copy the 'code' parameter from the URL")
        print("4. Paste it below")
        print()
        
        code = input("Enter authorization code: ").strip()
        
        if not code:
            print("❌ No code provided. Exiting.")
            return None
        
        # Exchange code for token
        print("\n🔄 Step 3: Exchanging code for token...")
        token_data = self.exchange_code_for_token(code)
        
        if not token_data:
            print("❌ Failed to get access token. Exiting.")
            return None
        
        access_token = token_data.get('access_token')
        refresh_token = token_data.get('refresh_token')
        scope = token_data.get('scope', '')
        
        print("✅ Successfully obtained access token!")
        print(f"Scopes granted: {scope}")
        print(f"Token type: {token_data.get('token_type')}")
        print(f"Expires in: {token_data.get('expires_in')} seconds")
        print()
        
        # Test the token
        print("🧪 Step 4: Testing token...")
        if self.test_token(access_token):
            print("\n🎉 OAuth flow completed successfully!")
            print("\n📋 Update your .env file with:")
            print("-" * 30)
            print(f"REDDIT_ACCESS_TOKEN={access_token}")
            if refresh_token:
                print(f"REDDIT_REFRESH_TOKEN={refresh_token}")
            print()
            
            return {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'scope': scope
            }
        else:
            print("❌ Token test failed. Please try again.")
            return None

def main():
    """Main function"""
    helper = RedditOAuthHelper()
    
    # Check if we have required credentials
    if not helper.client_id or not helper.client_secret:
        print("❌ Missing Reddit credentials in .env file")
        print("Please ensure REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET are set")
        return
    
    # Run OAuth flow
    result = helper.run_oauth_flow()
    
    if result:
        print("✅ All done! Your Reddit integration should now work with analytics.")
    else:
        print("❌ OAuth flow failed. Please check your credentials and try again.")

if __name__ == "__main__":
    main()
