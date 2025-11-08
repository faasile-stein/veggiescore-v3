# VeggieScore / MunchMatcher - Build Plan

This directory contains the detailed task breakdown for building VeggieScore/MunchMatcher, organized into 5 development phases over 16 weeks.

## Overview

Total Duration: **16 weeks (4 months)**
Total Tasks: **24 tasks**

## Phase 0: Infrastructure & Foundations (Weeks 1-2)

Foundation setup with Supabase, database, and workers.

- [01 - Supabase Setup](01-supabase-setup.md) - 2-3 days
- [02 - Database Schema](02-database-schema.md) - 3-4 days
- [03 - Worker Infrastructure](03-worker-infrastructure.md) - 2-3 days
- [04 - Basic Edge Functions](04-basic-edge-functions.md) - 3-4 days

**Phase Deliverables:**
- ✅ Supabase project configured
- ✅ Database schema deployed
- ✅ Worker infrastructure running
- ✅ Basic API endpoints functional

## Phase 1: Crawler + OCR Workers (Weeks 3-5)

Build web crawler and OCR processing pipeline.

- [05 - Crawler Service](05-crawler-service.md) - 5-7 days
- [06 - OCR Worker](06-ocr-worker.md) - 7-10 days
- [07 - Storage Integration](07-storage-integration.md) - 3-4 days
- [08 - Testing & Validation](08-testing-validation.md) - 4-5 days

**Phase Deliverables:**
- ✅ Crawler service deployed
- ✅ OCR workers running (3+ instances)
- ✅ First 10 restaurants fully processed
- ✅ OCR accuracy > 85%

## Phase 2: Parsing, Labeling & Admin (Weeks 6-8)

Parse menus, classify dietary labels, and build admin tools.

- [09 - Parser Service](09-parser-service.md) - 5-6 days
- [10 - AI Classifier](10-ai-classifier.md) - 6-7 days
- [11 - Admin Dashboard](11-admin-dashboard.md) - 8-10 days
- [12 - Manual Override System](12-manual-override-system.md) - 4-5 days

**Phase Deliverables:**
- ✅ Parser service deployed
- ✅ AI classifier integrated (rule-based + LLM fallback)
- ✅ Admin dashboard live
- ✅ Manual corrections functional

## Phase 3: Gamification + UX (Weeks 9-11)

Implement gamification and build mobile app.

- [13 - Gamification Backend](13-gamification-backend.md) - 7-8 days
- [14 - Mobile App](14-mobile-app.md) - 12-14 days
- [15 - Leaderboards](15-leaderboards.md) - 4-5 days
- [16 - Beta Launch](16-beta-launch.md) - 15 days (3 weeks)

**Phase Deliverables:**
- ✅ Gamification system live
- ✅ Mobile app (iOS + Android) in TestFlight/Play Console
- ✅ 50 beta users onboarded
- ✅ Engagement metrics dashboard

## Phase 4: Embeddings & MunchMatcher (Weeks 12-14)

Enable semantic search and improve scoring.

- [17 - Embeddings Pipeline](17-embeddings-pipeline.md) - 5-6 days
- [18 - Craving Search (MunchMatcher)](18-craving-search.md) - 6-7 days
- [19 - VeggieScore v2](19-veggiescore-v2.md) - 4-5 days
- [20 - SEO Optimization](20-seo-optimization.md) - 5-6 days

**Phase Deliverables:**
- ✅ Embeddings generated for all menu items
- ✅ Craving search functional
- ✅ VeggieScore v2 deployed
- ✅ SEO score > 90 on Lighthouse

## Phase 5: Hardening, Scaling & Polish (Weeks 15-16)

Deploy production infrastructure and optimize performance.

- [21 - Autoscaling Workers](21-autoscaling-workers.md) - 5-6 days
- [22 - Monitoring & Alerting](22-monitoring.md) - 5-6 days
- [23 - A/B Testing Framework](23-ab-testing.md) - 4-5 days
- [24 - Performance Optimization](24-performance-optimization.md) - 6-7 days

**Phase Deliverables:**
- ✅ Infrastructure autoscaling enabled
- ✅ Monitoring & alerting configured
- ✅ A/B testing framework live
- ✅ Performance: p95 < 500ms

## Task Structure

Each task file contains:
- **Phase**: Which development phase it belongs to
- **Objective**: High-level goal
- **Description**: Detailed explanation
- **Tasks**: Step-by-step checklist
- **Implementation Details**: Code examples and technical specifics
- **Success Criteria**: Definition of done
- **Dependencies**: Which tasks must be completed first
- **Estimated Time**: Duration estimate
- **Notes**: Additional considerations

## Getting Started

1. Start with Phase 0 tasks in order (01-04)
2. Complete all tasks in a phase before moving to the next
3. Check dependencies before starting each task
4. Use success criteria to validate completion
5. Refer to [DEVELOPMENT_PLAN.md](../DEVELOPMENT_PLAN.md) for detailed technical specifications

## Quick Reference

### Critical Path
The minimum viable product requires completing through Task 16 (Beta Launch):
- Phase 0: All tasks (01-04)
- Phase 1: All tasks (05-08)
- Phase 2: Tasks 09-11 (skip 12 initially)
- Phase 3: Tasks 13-16

### Technology Stack
- **Backend**: Supabase (PostgreSQL + pgvector + Edge Functions)
- **Frontend**: Next.js (web) + Expo (mobile)
- **Workers**: Node.js/Python with Redis/BullMQ
- **OCR**: PaddleOCR
- **AI**: OpenAI API (embeddings + classification)
- **Infrastructure**: Kubernetes + Docker

### Key Resources
- [Product Documentation](../PRODUCT.md)
- [Development Plan](../DEVELOPMENT_PLAN.md)
- Supabase docs: https://supabase.com/docs
- Expo docs: https://docs.expo.dev

---

**Ready to start building?** Begin with [Task 01: Supabase Setup](01-supabase-setup.md)! 🚀
