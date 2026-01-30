# Prototype

## Overview

This directory contains a **quick prototype** built on **n8n** to test the core hypotheses of the contract analysis application. The prototype validates the feasibility of using AI agents to identify risky clauses in legal contracts.

## Purpose

The n8n workflow served as a rapid proof-of-concept to:
- Test the AI's ability to detect risky contract clauses
- Validate the structured output format for legal analysis
- Experiment with PDF parsing and document processing
- Assess LLM effectiveness for startup-focused legal review

## Workflow

The `offer-analyze.json` file contains an n8n workflow that:
1. Receives contract documents via webhook or manual trigger
2. Parses PDFs using an external service
3. Uses an OpenAI-powered AI agent to analyze contract text
4. Identifies 3-5 risky clauses with severity levels (High/Medium/Low)
5. Returns structured JSON output with evidence snippets and page/line references

## Next Steps

This prototype will be **converted into a production application** with:
- Proper backend architecture
- Enhanced error handling and validation
- Scalable document processing
- Improved UI/UX for contract review