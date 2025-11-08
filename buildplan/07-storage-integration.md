# Task 07: Storage Integration

## Phase
Phase 1: Crawler + OCR Workers (Weeks 3-5)

## Objective
Integrate Supabase Storage for storing and managing all crawled artifacts and processed files.

## Description
Set up Supabase Storage buckets, implement file upload/download logic, create artifact tracking in the database, and establish file naming conventions and organization.

## Storage Buckets to Create

### 1. `menus` Bucket
- Original menu PDFs and images
- Organized by place_id
- Public read access for approved content

### 2. `artifacts` Bucket
- Raw crawl artifacts (HTML, JSON)
- OCR results
- Processed images
- Private access only

### 3. `user-uploads` Bucket
- User-submitted menu photos
- Temporary storage before processing
- Private with user-specific access

## Tasks
1. Create Supabase Storage buckets
2. Configure bucket policies and access rules
3. Implement file upload utilities
4. Create file download utilities
5. Set up file naming conventions
6. Implement artifact tracking in `raw_artifacts` table
7. Create content hashing for deduplication
8. Set up file retention policies
9. Implement storage cleanup for failed jobs
10. Test upload/download workflows
11. Monitor storage usage

## Implementation Details

```javascript
// Store artifacts
const { data, error } = await supabase.storage
  .from('menus')
  .upload(`${placeId}/${filename}`, fileBuffer);

// Store reference in DB
await supabase.from('raw_artifacts').insert({
  crawl_run_id,
  storage_path: data.path,
  mime_type: 'application/pdf',
  file_size: fileBuffer.length,
  content_hash: sha256(fileBuffer)
});
```

## File Organization
```
menus/
  {place_id}/
    {timestamp}-original.pdf
    {timestamp}-menu-1.jpg
    {timestamp}-menu-2.jpg

artifacts/
  {place_id}/
    {crawl_run_id}/
      raw.html
      structured-data.json
      ocr-results.json

user-uploads/
  {user_id}/
    {upload_id}/
      original.jpg
      processed.jpg
```

## Success Criteria
- [ ] All storage buckets created
- [ ] Bucket policies configured
- [ ] Upload utilities working
- [ ] Download utilities working
- [ ] File naming conventions implemented
- [ ] Artifact tracking functional
- [ ] Content hashing implemented
- [ ] Deduplication working
- [ ] Retention policies set
- [ ] Storage monitored
- [ ] Cleanup jobs running

## Dependencies
- Task 01: Supabase Setup
- Task 02: Database Schema

## Estimated Time
3-4 days

## Notes
- Monitor storage costs
- Implement file compression where appropriate
- Consider CDN for public assets
- Set up automated backups
- Plan for storage scaling
