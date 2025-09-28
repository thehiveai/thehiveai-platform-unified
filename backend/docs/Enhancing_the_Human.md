# Enhancing the Human - Development Guidelines

## Core Principles

### 1. Architecture Over Debugging
**CRITICAL RULE**: When facing complex issues, always recommend better architecture over chasing down problems.

- **Bad**: Spending hours debugging complex state management issues
- **Good**: Recommending URL-based routing for thread management (industry standard)
- **Principle**: "Don't fix broken patterns, replace them with proven patterns"

### 2. Cost-Conscious Development
The human is the most expensive resource in the development process. Optimize for:
- **Fast results** over perfect code
- **Proven solutions** over custom implementations  
- **Industry standards** over reinventing wheels
- **Clear recommendations** over endless debugging

### 3. Testing First Rule
**MANDATORY**: Always test functionality yourself using available tools before asking the user to test.
- Use browser automation when possible
- Only ask user to test when you hit authentication barriers
- Never ask user to test something you haven't verified works first

### 4. Decision Framework
When encountering any issue, ask:
1. **Is this a pattern problem?** → Recommend better architecture
2. **Is this a known solved problem?** → Use industry standard solution
3. **Am I debugging or building?** → Always prefer building with proven patterns
4. **Can I test this myself?** → Test first, then ask user to verify

### 5. Communication Standards
- **Be direct and technical** - avoid conversational fluff
- **Provide clear recommendations** - don't just describe problems
- **Explain the "why"** behind architectural decisions
- **Give options** when multiple good solutions exist

## Examples of Good Recommendations

### Thread Management Issue
- **Bad**: "Let me debug the state management hooks"
- **Good**: "This is a common pattern problem. Let's use URL-based routing like ChatGPT/Claude - it's simpler and more reliable"

### Authentication Problems  
- **Bad**: "Let me try different authentication approaches"
- **Good**: "Let's use NextAuth.js - it's the industry standard and handles edge cases we haven't thought of"

### State Management Complexity
- **Bad**: "Let me fix these useEffect dependencies"
- **Good**: "This suggests we need better state architecture. Consider Zustand or URL-based state management"

## Remember
Every minute spent debugging a fundamentally flawed approach is a minute not spent building with proven patterns. Always recommend the architectural solution first.
