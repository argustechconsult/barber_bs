import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { createCategory, getCategories } from '../actions/marketplace/marketplace.actions';

async function main() {
  console.log('--- MARKETPLACE VERIFICATION ---\n');

  try {
    // 1. Test Category Creation
    console.log('Testing Category Creation...');
    const catName = 'Test Category ' + Date.now();
    const createRes = await createCategory(catName);
    
    if (createRes.success && createRes.category) {
      console.log('✅ Successfully created category:', createRes.category.name);
      
      // 2. Test Category Fetching
      console.log('\nTesting Category Fetching...');
      const getRes = await getCategories();
      if (getRes.success) {
        console.log('✅ Found', getRes.categories.length, 'categories');
        const found = getRes.categories.find(c => c.name === catName);
        if (found) {
          console.log('✅ Verified persistence: New category found in list');
        } else {
          console.error('❌ Persistence verification failed: New category NOT found in list');
        }
      } else {
        console.error('❌ Failed to fetch categories:', getRes.message);
      }
    } else {
      console.error('❌ Failed to create category:', createRes.message);
    }

  } catch (error) {
    console.error('\nVerification failed:', error);
  } finally {
    process.exit();
  }
}

main();
