# Amazfit AI Coach v0.2.0

MCP app for ChatGPT with a real provider adapter for the Huami/Zepp REST API.

## Implemented
- Streamable HTTP MCP endpoint: `/mcp`
- ChatGPT MCP Apps UI resource
- Connection status
- Zepp OAuth authorization-code callback scaffold
- Profile
- Activity summary
- Sleep summary
- Heart-rate retrieval
- Server-side token storage for prototype use

## Important upstream constraint
The server never asks for a Zepp password. Official cloud/API credentials must be issued to a registered application before production OAuth can be enabled.

## Deployment
Deploy behind HTTPS and configure the environment variables in `.env.example`.
