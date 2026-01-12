"""
BrowserBase connection helper for remote Playwright sessions.
Uses CDP (Chrome DevTools Protocol) to connect to BrowserBase-hosted browsers.
"""
import os
import logging
from typing import Optional

from playwright.async_api import Playwright, Browser

logger = logging.getLogger(__name__)


class BrowserBaseConnector:
    """
    Manages BrowserBase session lifecycle for remote Playwright connections.
    
    Usage:
        connector = BrowserBaseConnector()
        await connector.create_session()
        browser = await connector.connect_browser(playwright)
        # ... use browser ...
        await connector.close_session()
    """
    
    def __init__(
        self,
        project_id: Optional[str] = None,
        api_key: Optional[str] = None,
    ):
        """
        Initialize BrowserBase connector.
        
        Args:
            project_id: BrowserBase project ID (defaults to BROWSERBASE_PROJECT_ID env var)
            api_key: BrowserBase API key (defaults to BROWSERBASE_API_KEY env var)
        """
        self.project_id = project_id or os.getenv("BROWSERBASE_PROJECT_ID")
        self.api_key = api_key or os.getenv("BROWSERBASE_API_KEY")
        
        if not self.project_id or not self.api_key:
            raise ValueError(
                "BrowserBase credentials required. Set BROWSERBASE_PROJECT_ID and "
                "BROWSERBASE_API_KEY environment variables, or pass them to constructor."
            )
        
        # Lazy import to avoid dependency issues when not using BrowserBase mode
        from browserbase import Browserbase
        
        self.client = Browserbase(api_key=self.api_key)
        self.session_id: Optional[str] = None
        self._connect_url: Optional[str] = None
    
    async def create_session(self) -> str:
        """
        Create a new BrowserBase session.
        
        Returns:
            str: The session ID
        """
        # Create session and store the connect_url from the response
        session = self.client.sessions.create(project_id=self.project_id)
        self.session_id = session.id
        self._connect_url = session.connect_url
        logger.info(f"Created BrowserBase session: {self.session_id}")
        return self.session_id
    
    def get_connect_url(self) -> str:
        """
        Get the CDP WebSocket URL for Playwright connection.
        
        Returns:
            str: The CDP WebSocket URL
            
        Raises:
            ValueError: If no session has been created yet
        """
        if not self.session_id:
            raise ValueError("No session created. Call create_session() first.")
        
        if not self._connect_url:
            raise ValueError("No connect URL available. Session may not have been created properly.")
            
        return self._connect_url
    
    async def connect_browser(self, playwright: Playwright) -> Browser:
        """
        Connect Playwright to the remote BrowserBase session.
        
        Args:
            playwright: The Playwright instance to use for connection
            
        Returns:
            Browser: The connected Playwright browser instance
        """
        if not self.session_id:
            await self.create_session()
            
        connect_url = self.get_connect_url()
        logger.info(f"Connecting to BrowserBase via CDP...")
        
        browser = await playwright.chromium.connect_over_cdp(connect_url)
        logger.info("Successfully connected to BrowserBase browser")
        
        return browser
    
    async def close_session(self) -> None:
        """
        Close the BrowserBase session and mark it as completed.
        """
        if not self.session_id:
            return
            
        try:
            self.client.sessions.update(self.session_id, status="REQUEST_RELEASE")
            logger.info(f"Closed BrowserBase session: {self.session_id}")
        except Exception as e:
            # Session may already be closed or expired
            logger.warning(f"Failed to close session {self.session_id}: {e}")
        finally:
            self.session_id = None
            self._connect_url = None
    
    def get_session_url(self) -> Optional[str]:
        """
        Get the BrowserBase dashboard URL for viewing this session.
        
        Returns:
            str or None: The session URL, or None if no session exists
        """
        if not self.session_id:
            return None
        return f"https://browserbase.com/sessions/{self.session_id}"
    
    def __repr__(self) -> str:
        return f"BrowserBaseConnector(session_id={self.session_id})"
