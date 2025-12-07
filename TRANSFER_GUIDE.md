# How to Transfer Data to Your Phone

The Rhythm Archive app uses IndexedDB, which stores data locally in each browser. To transfer your rhythm data from your computer to your phone, follow these steps:

## Step 1: Export Data from Your Computer

1. Open the Rhythm Archive app on your computer (http://10.0.0.165:5173/ or wherever it's hosted)
2. On the Rhythm List page, look for the **download icon** (downward arrow) in the toolbar
3. Click the export button
4. A JSON file will download automatically named something like `rhythm-archive-export-2025-01-25.json`
5. Save this file somewhere accessible

## Step 2: Transfer the JSON File to Your Phone

Choose one of these methods:

### Option A: Email
- Email the JSON file to yourself
- Open the email on your phone

### Option B: Cloud Storage (Recommended)
- Upload the JSON file to Google Drive, iCloud, Dropbox, etc.
- Access it from your phone

### Option C: Direct Transfer
- Use AirDrop (iPhone) or nearby Share (Android)
- Or connect your phone via USB and copy the file

## Step 3: Import Data on Your Phone

1. Open the Rhythm Archive app on your phone's browser
   - If hosted on network: http://10.0.0.165:5173/
   - If hosted online: visit your deployed URL

2. On the Rhythm List page, tap the **upload icon** (upward arrow) in the toolbar

3. Select the JSON file you transferred
   - On iPhone: Choose from Files app or email attachment
   - On Android: Choose from Downloads or file manager

4. Wait for the import to complete
   - You'll see an alert message confirming the import
   - Example: "Successfully imported 5 tags, 3 rhythms, and 8 recordings"

5. Refresh the page if needed - your data should now be visible!

## Important Notes

### Data is Device-Specific
- Each device maintains its own copy of the data
- Changes on one device won't automatically sync to others
- You need to export/import again to keep devices in sync

### Import Overwrites Existing Data
- **Warning**: Importing will replace ALL existing data on that device
- If you have recordings on your phone, export them first before importing from computer
- You cannot merge data from two devices (yet)

### File Size Considerations
- The JSON export includes all audio recordings encoded as base64
- Files can be large (several MB) if you have many recordings
- Ensure you have good WiFi when transferring large files to your phone

### Troubleshooting

**Import fails or shows error:**
- Make sure you're selecting the correct JSON file
- Try exporting again from the computer
- Check that the file downloaded completely

**Data doesn't appear after import:**
- Refresh the page (pull down on mobile)
- Check browser console for errors
- Try clearing browser cache and importing again

**File won't open on phone:**
- Make sure the file has a .json extension
- Try saving to a different location first
- Some email apps may rename files - check the actual filename

## Tips for Multi-Device Use

1. **Designate a "main" device** (probably your computer) where you do most data entry
2. **Export regularly** to keep a backup
3. **Import to other devices** when you want to practice on the go
4. **Keep exports organized** with dates in the filename

## Future Enhancement

Currently, this is a manual process. In the future, we could add:
- Automatic cloud syncing
- User accounts
- Selective import (merge instead of replace)
- Version conflict resolution

For now, the export/import system gives you full control over your data!
