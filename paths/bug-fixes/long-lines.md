# Lines Exceeding 100 Characters

## emailTriggers.ts
1. Line 17: 145 characters
2. Line 18: 110 characters
3. Line 81: 106 characters
4. Line 86: 106 characters

## reportScheduler.ts
1. Line 11: 116 characters
2. Line 178: 108 characters
3. Line 183: 109 characters

## cloudFunctionsUtils.ts
1. Line 14: 101 characters

## Summary
- Total lines exceeding 100 characters: 7
- Maximum line length: 145 characters (emailTriggers.ts:17)
- Files affected: 3
  - emailTriggers.ts: 3 lines
  - reportScheduler.ts: 3 lines
  - cloudFunctionsUtils.ts: 1 line

# Other ESLint Issues

## JSDoc Issues
1. Missing JSDoc comments in cloudFunctionsUtils.ts (lines 14, 31, 46, 73)
2. Missing JSDoc return types in reportScheduler.ts (lines 14, 42, 113)
3. Missing JSDoc parameter types in multiple files
4. JSDoc syntax error in emailTriggers.ts (line 13)
5. Incorrect JSDoc syntax (using @return instead of @returns)

## Type Issues
1. Unexpected 'any' types in reportScheduler.ts (multiple lines)
2. Unexpected 'any' types in cloudFunctionsUtils.ts (multiple lines)

## Import/Require Issues
1. Require statements not part of import statements in reportScheduler.ts (lines 60, 124)

## Unused Variables
1. 'context' is defined but never used in reportScheduler.ts (line 121)
2. 'userId' is defined but never used in cloudFunctionsUtils.ts (line 82)

## ESLint Configuration Options

If these issues are not critical for your project, you can modify the ESLint configuration in `.eslintrc.js` to ignore certain rules. Here are some options:

1. For line length:
```javascript
rules: {
  'max-len': ['error', { code: 120 }] // Increase max line length
  // or
  'max-len': 'off' // Disable line length check
}
```

2. For JSDoc:
```javascript
rules: {
  'valid-jsdoc': 'off', // Disable JSDoc validation
  'require-jsdoc': 'off' // Disable JSDoc requirement
}
```

3. For TypeScript specific rules:
```javascript
rules: {
  '@typescript-eslint/no-explicit-any': 'off', // Allow any types
  '@typescript-eslint/no-unused-vars': 'off' // Allow unused variables
}
```

4. For import/require:
```javascript
rules: {
  '@typescript-eslint/no-var-requires': 'off' // Allow require statements
}
```

Note: While these configurations can help bypass the linting errors, it's generally recommended to:
1. Keep JSDoc documentation for better code maintainability
2. Use proper types instead of 'any' for type safety
3. Clean up unused variables to prevent confusion
4. Use consistent import/require patterns

The line length rule is more flexible and can be adjusted based on team preferences, but other rules should be carefully considered before disabling them.

## Summary
- Total errors: 28
- Total warnings: 13
- Main categories:
  - JSDoc documentation (14 issues)
  - Type safety (8 issues)
  - Import/Require statements (2 issues)
  - Unused variables (2 issues)
  - Line length (7 issues)

# ESLint Errors by File

## emailTriggers.ts
1. DONE Missing JSDoc return type (line 13)
2. DONE Missing JSDoc parameter type for 'templateId' (line 15)
3. DONE Missing JSDoc parameter type for 'docPath' (line 16)
4. DONE Missing JSDoc parameter type for 'extractData' (line 17)
5. DONE Use @return instead (line 18)
6. DONE Trailing spaces not allowed (line 80)

## reportScheduler.ts
1. DONE Missing JSDoc return type (line 14)
2. DONE Missing JSDoc parameter type for 'cadence' (line 16)
3. DONE JSDoc syntax error (line 42)
4. DONE Require statement not part of import statement (line 60)
5. DONE Multiple 'any' type warnings (lines 63, 66, 69, 72)
6. DONE Missing JSDoc parameter type for 'cadence' (line 115)
7. DONE Use @return instead (line 116)
8. 'context' is defined but never used (line 121)
9. DONE Require statement not part of import statement (line 124)

## cloudFunctionsUtils.ts
1. DONE Missing JSDoc comment (line 14)
2. DONE JSDoc syntax error (line 39)
3. DONE Missing JSDoc parameter type for 'landlordId' (line 63)
4. DONE Use @return instead (line 64)
5. DONE 'any' type warning (line 83)
6. DONE Missing JSDoc comment (line 93)
7. DONE 'userId' is defined but never used (line 102)
8. DONE Missing JSDoc parameter types for 'template', 'data', and 'context' (lines 132-134)
9. DONE Use @return instead (line 135)
10. DONE Multiple 'any' type warnings (lines 137, 140, 141)
11. DONE JSDoc syntax error (line 160)

## Summary
- Total errors: 23
- Total warnings: 13
- Main categories:
  - JSDoc documentation issues (15 errors)
  - Type safety issues (8 warnings)
  - Import/Require statement issues (2 errors)
  - Unused variables (2 warnings)
  - Syntax errors (3 errors)

## Action Items
1. Fix all JSDoc documentation issues:
   - Add missing return types
   - Add missing parameter types
DONE   - Replace @return with @returns - DONE
   - Fix syntax errors
2. Replace 'any' types with proper TypeScript types
3. Convert require statements to import statements
4. Remove unused variables
5. Fix trailing spaces

Note: 5 errors and 0 warnings are potentially fixable with the `--fix` option 