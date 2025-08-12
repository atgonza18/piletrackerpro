# GitHub MCP Setup Guide

## Configuration Status

We have successfully:
1. Created the Docker-based GitHub MCP configuration
2. Placed it in the proper location at `C:\Users\19159\AppData\Roaming\mcp\config.json`
3. Pulled the GitHub MCP server Docker image

## Next Steps

To complete the setup:

1. Edit the config file to add your GitHub token:
   ```powershell
   notepad "$env:APPDATA\mcp\config.json"
   ```

2. Replace the placeholder `"your_actual_token_here"` with your GitHub Personal Access Token.
   - The token needs at least `repo` scope permissions
   - Make sure to keep the quotes around your token

3. Save the file and close Notepad

4. Restart Cursor completely (exit and relaunch)

5. Once Cursor restarts, the GitHub MCP tools should appear in the available tools list

## Troubleshooting

If the GitHub MCP tools don't appear after restart:

1. Verify Docker is running:
   ```powershell
   docker info
   ```

2. Test the GitHub MCP server container:
   ```powershell
   docker run --rm -e GITHUB_PERSONAL_ACCESS_TOKEN="YOUR_GITHUB_TOKEN_HERE" ghcr.io/github/github-mcp-server
   ```

3. Check the Cursor logs for any errors related to MCP 