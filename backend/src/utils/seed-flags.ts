import { pool } from '../config/database';
import { COUNTRIES } from '../data/countries';

/**
 * Seeds the flags table with country data
 * This script populates the database with flag information including
 * country codes, names, image URLs, regions, colors, and difficulty levels
 */
export async function seedFlags(): Promise<void> {
  const client = await pool.connect();
  
  try {
    console.log('Starting flag database seeding...');
    
    // Clear existing data
    await client.query('DELETE FROM flags');
    console.log('Cleared existing flag data');
    
    // Prepare the insert query
    const insertQuery = `
      INSERT INTO flags (country_code, country_name, image_url, region, colors, difficulty_level)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (country_code) 
      DO UPDATE SET 
        country_name = EXCLUDED.country_name,
        image_url = EXCLUDED.image_url,
        region = EXCLUDED.region,
        colors = EXCLUDED.colors,
        difficulty_level = EXCLUDED.difficulty_level,
        updated_at = NOW()
    `;
    
    // Insert each country
    let insertedCount = 0;
    for (const country of COUNTRIES) {
      try {
        await client.query(insertQuery, [
          country.code,
          country.name,
          country.imageUrl,
          country.region,
          country.colors,
          country.difficulty
        ]);
        insertedCount++;
      } catch (error) {
        console.error(`Failed to insert country ${country.code} (${country.name}):`, error);
      }
    }
    
    console.log(`Successfully inserted ${insertedCount} countries`);
    
    // Verify the data
    const countResult = await client.query('SELECT COUNT(*) FROM flags');
    const totalFlags = parseInt(countResult.rows[0].count);
    
    const regionResult = await client.query(`
      SELECT region, COUNT(*) as count 
      FROM flags 
      GROUP BY region 
      ORDER BY count DESC
    `);
    
    const difficultyResult = await client.query(`
      SELECT difficulty_level, COUNT(*) as count 
      FROM flags 
      GROUP BY difficulty_level 
      ORDER BY difficulty_level
    `);
    
    console.log('\n=== Seeding Summary ===');
    console.log(`Total flags in database: ${totalFlags}`);
    console.log('\nFlags by region:');
    regionResult.rows.forEach(row => {
      console.log(`  ${row.region}: ${row.count}`);
    });
    
    console.log('\nFlags by difficulty:');
    difficultyResult.rows.forEach(row => {
      console.log(`  Level ${row.difficulty_level}: ${row.count}`);
    });
    
    console.log('\nFlag database seeding completed successfully!');
    
  } catch (error) {
    console.error('Error seeding flags:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Validates that all flag images are accessible
 * This is useful for checking if CDN URLs are working
 */
export async function validateFlagImages(): Promise<void> {
  console.log('Validating flag image URLs...');
  
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT country_code, country_name, image_url FROM flags');
    const flags = result.rows;
    
    let validCount = 0;
    let invalidCount = 0;
    
    for (const flag of flags) {
      try {
        // Simple URL validation - in production you might want to actually fetch the images
        const url = new URL(flag.image_url);
        if (url.protocol === 'https:' && url.hostname === 'flagcdn.com') {
          validCount++;
        } else {
          console.warn(`Invalid URL format for ${flag.country_code}: ${flag.image_url}`);
          invalidCount++;
        }
      } catch (error) {
        console.error(`Invalid URL for ${flag.country_code} (${flag.country_name}): ${flag.image_url}`);
        invalidCount++;
      }
    }
    
    console.log(`\nImage URL validation complete:`);
    console.log(`  Valid URLs: ${validCount}`);
    console.log(`  Invalid URLs: ${invalidCount}`);
    
  } finally {
    client.release();
  }
}

// CLI execution
if (require.main === module) {
  seedFlags()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}