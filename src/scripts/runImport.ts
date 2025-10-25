import { importRhythmsData } from '../utils/importData';

// Run the import
importRhythmsData()
  .then(() => {
    console.log('✅ Import completed successfully!');
    console.log('You can now close this and check your rhythms list.');
  })
  .catch((error) => {
    console.error('❌ Import failed:', error);
  });
