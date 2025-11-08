# Task 12: Manual Override System

## Phase
Phase 2: Parsing, Labeling & Admin (Weeks 6-8)

## Objective
Implement a system for admins to manually correct and override parsed menu data with full audit trail.

## Description
Build functionality for admins to make manual corrections to menu items, track changes in the manual_overrides table, maintain audit logs, and optionally implement an approval workflow.

## Core Features

### 1. Override Interface
- Edit menu item fields inline
- Compare original vs current vs new
- Show confidence scores
- Bulk edit capabilities

### 2. Override Tracking
- Store original and new values
- Track who made the change
- Record reason for override
- Timestamp all changes

### 3. Audit Trail
- Complete change history
- Before/after comparison
- Admin identification
- Rollback capability

### 4. Approval Workflow (Optional)
- Submit override for review
- Approve/reject system
- Multi-level approval

## Tasks
1. Create override UI components
2. Build inline editing interface
3. Implement field-level override logic
4. Create manual_overrides table integration
5. Build audit logging system
6. Implement change history view
7. Create rollback functionality
8. Add override statistics
9. Build approval workflow (if needed)
10. Add validation rules
11. Test override scenarios

## Implementation Details

```typescript
async function saveOverride(itemId: string, field: string, newValue: any) {
  const item = await getMenuItem(itemId);

  // Create manual override
  await supabase.from('manual_overrides').insert({
    menu_item_id: itemId,
    field,
    original_value: item[field],
    override_value: newValue,
    admin_id: currentAdmin.id,
    reason: 'Manual correction from admin panel'
  });

  // Update menu item
  await supabase
    .from('menu_items')
    .update({ [field]: newValue })
    .eq('id', itemId);

  // Log audit trail
  await supabase.from('admin_audit_logs').insert({
    admin_id: currentAdmin.id,
    action: 'edit_menu_item',
    resource_type: 'menu_item',
    resource_id: itemId,
    before: { [field]: item[field] },
    after: { [field]: newValue }
  });
}
```

## Overridable Fields
- `name` - Item name
- `description` - Item description
- `price` - Price
- `dietary_labels` - Labels array
- `ingredients` - Ingredients list
- `section` - Menu section

## Success Criteria
- [ ] Override UI implemented
- [ ] Inline editing functional
- [ ] Override tracking working
- [ ] Audit logs complete
- [ ] Change history viewable
- [ ] Rollback working
- [ ] Validation rules enforced
- [ ] Statistics available
- [ ] Approval workflow (if implemented)
- [ ] Tested with various scenarios

## Dependencies
- Task 11: Admin Dashboard
- Task 02: Database Schema

## Estimated Time
4-5 days

## Notes
- Track override frequency to identify parsing issues
- Consider ML training from overrides
- Set up alerts for excessive overrides
- Allow comments on overrides
- Export override data for analysis
