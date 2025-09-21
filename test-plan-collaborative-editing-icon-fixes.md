# Test Plan: Collaborative Editing and Icon Update Fixes

## Overview
This test plan verifies that the fixes for collaborative editing errors and action card sheet closure issues work correctly for transformation action cards. The fixes address:

1. Collaborative editing errors when opening description editors on transformation action cards
2. Action cards closing unexpectedly when icon updates happen from either the action card sheet or embedded item sheets

## Test Environment Setup

### Prerequisites
- Foundry VTT instance running the Eventide RP System
- At least one Actor with transformation capabilities
- At least one Transformation item with embedded action cards
- Multiple browser windows/tabs for collaborative testing (optional but recommended)

### Test Data Preparation
1. Create or locate an Actor that can use transformations
2. Create or locate a Transformation item with at least 2-3 embedded action cards
3. Ensure action cards have:
   - Different icons
   - Description content
   - Embedded items (combat powers or status effects)
   - Effects with different tint colors

## Test Cases

### Test Case 1: Description Editor Collaborative Editing
**Objective**: Verify that description editors open without collaborative editing errors

#### Steps:
1. Open an Actor sheet
2. Navigate to the Action Cards tab
3. Transform the actor using a transformation that has embedded action cards
4. Verify transformation action cards appear with transformation indicator
5. Click the "Edit" button on a transformation action card
6. In the action card sheet, click on the Description tab
7. Click in the description text area to open the rich text editor
8. Verify the editor opens without errors
9. Type some test content in the editor
10. Save the content (Ctrl+S or click outside editor)
11. Verify content is saved and no errors occur

**Expected Results**:
- Description editor opens without collaborative editing errors
- No console errors related to collaborative editing
- Content saves successfully
- Action card sheet remains open

### Test Case 2: Icon Updates from Action Card Sheet
**Objective**: Verify action card sheets don't close when updating icons

#### Steps:
1. Continue from Test Case 1 or open a transformation action card
2. In the action card sheet header, click the icon image
3. Select a different icon from the file picker
4. Confirm the icon selection
5. Verify the icon updates in the sheet
6. Check that the action card sheet remains open
7. Verify the icon also updates in the parent Actor's action cards list
8. Try updating the icon multiple times with different images

**Expected Results**:
- Icon updates successfully in the action card sheet
- Action card sheet remains open after icon update
- Icon updates are reflected in the parent Actor's action cards list
- No unexpected sheet closures occur
- No console errors

### Test Case 3: Icon Tint Updates from Action Card Sheet
**Objective**: Verify tint changes don't cause sheet closures

#### Steps:
1. Open a transformation action card that has effects
2. Navigate to the Character Effects tab
3. Locate the icon tint color picker
4. Change the tint color
5. Verify the color change is applied immediately
6. Check that the action card sheet remains open
7. Verify the tint change is reflected in the Actor's action cards list
8. Try multiple tint color changes

**Expected Results**:
- Tint color updates immediately
- Action card sheet remains open
- Changes are reflected in parent sheet
- No console errors occur

### Test Case 4: Icon Updates from Embedded Item Sheets
**Objective**: Verify embedded item icon updates don't close action card sheets

#### Steps:
1. Open a transformation action card that has an embedded item
2. Navigate to the Embedded Items tab
3. Click "Edit" on the embedded item
4. In the embedded item sheet, click the icon image
5. Select a different icon
6. Confirm the selection
7. Verify the embedded item sheet shows the new icon
8. Close the embedded item sheet
9. Verify the action card sheet is still open
10. Verify the new icon appears in the action card's embedded items section
11. Check the Actor's action cards list shows the updated embedded item icon

**Expected Results**:
- Embedded item icon updates successfully
- Embedded item sheet closes normally
- Action card sheet remains open
- Icon changes are reflected in all relevant locations
- No unexpected sheet closures

### Test Case 5: Embedded Effect Icon/Tint Updates
**Objective**: Verify embedded effect updates don't cause sheet closures

#### Steps:
1. Open a transformation action card with embedded effects
2. Navigate to the Embedded Items tab
3. Click "Edit" on an embedded effect
4. In the embedded effect sheet, update the icon or tint
5. Save the changes
6. Close the embedded effect sheet
7. Verify the action card sheet remains open
8. Check that changes are reflected in the embedded effects list

**Expected Results**:
- Embedded effect updates save successfully
- Action card sheet remains open after embedded effect editing
- Changes are visible in the embedded effects list

### Test Case 6: Multiple Concurrent Updates
**Objective**: Test stability with rapid or concurrent updates

#### Steps:
1. Open a transformation action card
2. Rapidly perform multiple updates in sequence:
   - Update action card icon
   - Update action card tint
   - Edit embedded item icon
   - Update description content
3. Verify all updates are saved correctly
4. Verify the action card sheet remains stable and open
5. Check that all changes are reflected in the Actor's action cards list

**Expected Results**:
- All updates are processed successfully
- No sheet closures occur
- Data consistency is maintained
- No race condition errors

### Test Case 7: Cross-Sheet Data Consistency
**Objective**: Verify data updates are consistent across all related sheets

#### Steps:
1. Open an Actor sheet with the Action Cards tab visible
2. Open a transformation action card sheet
3. Make updates to the action card (icon, description, etc.)
4. Without closing the action card sheet, observe the Actor sheet
5. Verify updates appear in the Actor's action cards list
6. Open another instance of the same action card (if possible)
7. Verify both instances show consistent data

**Expected Results**:
- Data updates are immediately reflected across all open sheets
- No data inconsistencies between sheets
- All sheets remain stable and functional

### Test Case 8: Editor State Preservation
**Objective**: Verify rich text editors maintain their state during updates

#### Steps:
1. Open a transformation action card
2. Open the description editor
3. Type some content but don't save yet
4. While the editor is open, update the action card icon
5. Verify the editor content is preserved
6. Complete the text editing and save
7. Verify both the text and icon updates are saved

**Expected Results**:
- Text editor content is preserved during icon updates
- Both text and icon changes save successfully
- No editor state corruption occurs

### Test Case 9: Error Handling and Recovery
**Objective**: Verify graceful handling of edge cases

#### Steps:
1. Open a transformation action card
2. Attempt to update with invalid data (if possible)
3. Verify appropriate error messages appear
4. Verify the sheet remains functional after errors
5. Test recovery by making valid updates

**Expected Results**:
- Appropriate error messages for invalid operations
- Sheets remain functional after errors
- System recovers gracefully from error states

## Success Criteria

### Primary Objectives Met:
- ✅ Description editors open without collaborative editing errors
- ✅ Action card sheets remain open during icon updates
- ✅ Icon updates from embedded item sheets don't close parent sheets
- ✅ All data updates are properly saved and synchronized

### Secondary Objectives Met:
- ✅ No console errors during normal operations
- ✅ Data consistency maintained across all related sheets
- ✅ Rich text editor state preserved during updates
- ✅ Graceful error handling and recovery

## Test Execution Notes

### Console Monitoring
During all tests, monitor the browser console for:
- Collaborative editing errors
- Sheet rendering errors
- Database update errors
- Any warnings or exceptions

### Performance Considerations
- Note any performance degradation during rapid updates
- Verify memory usage remains stable
- Check for potential memory leaks with repeated operations

### Browser Compatibility
If possible, test across different browsers:
- Chrome/Chromium
- Firefox
- Safari (if available)
- Edge

## Troubleshooting Common Issues

### If Collaborative Editing Errors Still Occur:
1. Check that `_getEditorOptions()` is properly overridden
2. Verify `options.collaborative = false` is set for transformation action cards
3. Confirm `_isTransformationActionCard()` detection is working

### If Sheets Still Close Unexpectedly:
1. Verify `fromEmbeddedItem: true` flag is used for icon updates
2. Check that `render: false` is used in update calls
3. Confirm proper handling in transformation action card update methods

### If Data Inconsistency Occurs:
1. Check that `updateSource()` is called before `update()`
2. Verify proper data flow from embedded items to parent sheets
3. Confirm all relevant sheets are re-rendered after updates

## Test Results Documentation

For each test case, document:
- ✅ Pass / ❌ Fail status
- Any observed issues or anomalies
- Console error messages (if any)
- Steps to reproduce any failures
- Suggested fixes or improvements

## Regression Testing

After any code changes, re-run this entire test suite to ensure:
- Previously fixed issues remain resolved
- New changes don't introduce regressions
- System stability is maintained