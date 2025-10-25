import { questionGenerator } from '../services/question-generator';
import { flagService } from '../services/flag-service';
import { testConnection } from '../config/database';

/**
 * Test script for question generation functionality
 * Validates that the question generator works correctly with various parameters
 */
async function testQuestionGeneration(): Promise<void> {
  console.log('Testing Question Generation System...\n');
  
  // Test database connection
  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('Database connection failed. Cannot proceed with tests.');
    return;
  }
  
  try {
    // Test 1: Basic question generation
    console.log('=== Test 1: Basic Question Generation ===');
    const basicQuestion = await questionGenerator.generateQuestion(4);
    console.log(`Generated question with ${basicQuestion.choices.length} choices`);
    console.log(`Correct answer: ${basicQuestion.correctCountry.name} (${basicQuestion.correctCountry.code})`);
    console.log(`Choices: ${basicQuestion.choices.map(c => c.name).join(', ')}`);
    
    const isValid = questionGenerator.validateQuestion(basicQuestion);
    console.log(`Question validation: ${isValid ? 'PASSED' : 'FAILED'}`);
    console.log('');
    
    // Test 2: Different choice counts
    console.log('=== Test 2: Different Choice Counts ===');
    for (const choiceCount of [2, 4, 8, 16]) {
      try {
        const question = await questionGenerator.generateQuestion(choiceCount);
        const hasCorrectCount = question.choices.length === choiceCount;
        const isValidQuestion = questionGenerator.validateQuestion(question);
        
        console.log(`${choiceCount} choices: ${hasCorrectCount && isValidQuestion ? 'PASSED' : 'FAILED'}`);
        if (!hasCorrectCount) {
          console.log(`  Expected ${choiceCount}, got ${question.choices.length}`);
        }
      } catch (error) {
        console.log(`${choiceCount} choices: FAILED - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    console.log('');
    
    // Test 3: Difficulty filtering
    console.log('=== Test 3: Difficulty Filtering ===');
    for (let difficulty = 1; difficulty <= 4; difficulty++) {
      try {
        const question = await questionGenerator.generateQuestion(4, [], difficulty);
        const correctDifficulty = question.correctCountry.difficulty === difficulty;
        
        console.log(`Difficulty ${difficulty}: ${correctDifficulty ? 'PASSED' : 'FAILED'}`);
        if (!correctDifficulty) {
          console.log(`  Expected difficulty ${difficulty}, got ${question.correctCountry.difficulty}`);
        }
        console.log(`  Correct answer: ${question.correctCountry.name} (Level ${question.correctCountry.difficulty})`);
      } catch (error) {
        console.log(`Difficulty ${difficulty}: FAILED - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    console.log('');
    
    // Test 4: Exclusion functionality
    console.log('=== Test 4: Country Exclusion ===');
    const excludeCountries = ['US', 'GB', 'FR', 'DE', 'JP'];
    const excludedQuestion = await questionGenerator.generateQuestion(4, excludeCountries);
    
    const hasExcludedCountry = excludedQuestion.choices.some(choice => 
      excludeCountries.includes(choice.code)
    );
    
    console.log(`Exclusion test: ${!hasExcludedCountry ? 'PASSED' : 'FAILED'}`);
    if (hasExcludedCountry) {
      const found = excludedQuestion.choices.filter(choice => 
        excludeCountries.includes(choice.code)
      );
      console.log(`  Found excluded countries: ${found.map(c => c.code).join(', ')}`);
    }
    console.log(`Choices: ${excludedQuestion.choices.map(c => `${c.name} (${c.code})`).join(', ')}`);
    console.log('');
    
    // Test 5: Geographic similarity
    console.log('=== Test 5: Geographic Similarity Analysis ===');
    const europeQuestion = await questionGenerator.generateQuestion(8);
    const correctCountry = europeQuestion.correctCountry;
    const sameRegionChoices = europeQuestion.choices.filter(choice => 
      choice.region === correctCountry.region && choice.code !== correctCountry.code
    );
    
    console.log(`Correct answer: ${correctCountry.name} (${correctCountry.region})`);
    console.log(`Same region choices: ${sameRegionChoices.length}/7`);
    console.log(`Same region countries: ${sameRegionChoices.map(c => c.name).join(', ')}`);
    
    // Show all choices by region
    const choicesByRegion: Record<string, string[]> = {};
    europeQuestion.choices.forEach(choice => {
      if (!choicesByRegion[choice.region]) {
        choicesByRegion[choice.region] = [];
      }
      choicesByRegion[choice.region].push(choice.name);
    });
    
    console.log('Choices by region:');
    Object.entries(choicesByRegion).forEach(([region, countries]) => {
      console.log(`  ${region}: ${countries.join(', ')}`);
    });
    console.log('');
    
    // Test 6: Color similarity
    console.log('=== Test 6: Color Similarity Analysis ===');
    const colorQuestion = await questionGenerator.generateQuestion(6);
    const correctColors = colorQuestion.correctCountry.colors;
    const similarColorChoices = colorQuestion.choices.filter(choice => 
      choice.code !== colorQuestion.correctCountry.code &&
      choice.colors.some(color => correctColors.includes(color))
    );
    
    console.log(`Correct answer: ${colorQuestion.correctCountry.name}`);
    console.log(`Correct colors: ${correctColors.join(', ')}`);
    console.log(`Similar color choices: ${similarColorChoices.length}/5`);
    similarColorChoices.forEach(choice => {
      const sharedColors = choice.colors.filter(color => correctColors.includes(color));
      console.log(`  ${choice.name}: ${choice.colors.join(', ')} (shared: ${sharedColors.join(', ')})`);
    });
    console.log('');
    
    // Test 7: Performance test
    console.log('=== Test 7: Performance Test ===');
    const startTime = Date.now();
    const promises = [];
    
    for (let i = 0; i < 10; i++) {
      promises.push(questionGenerator.generateQuestion(4));
    }
    
    await Promise.all(promises);
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / 10;
    
    console.log(`Generated 10 questions in ${endTime - startTime}ms`);
    console.log(`Average time per question: ${avgTime.toFixed(2)}ms`);
    console.log('');
    
    // Test 8: Statistics
    console.log('=== Test 8: Database Statistics ===');
    const stats = await questionGenerator.getAvailableCountriesStats();
    console.log(`Total countries: ${stats.total}`);
    console.log('Countries by region:');
    Object.entries(stats.byRegion).forEach(([region, count]) => {
      console.log(`  ${region}: ${count}`);
    });
    console.log('Countries by difficulty:');
    Object.entries(stats.byDifficulty).forEach(([difficulty, count]) => {
      console.log(`  Level ${difficulty}: ${count}`);
    });
    console.log('');
    
    // Test 9: Edge cases
    console.log('=== Test 9: Edge Cases ===');
    
    // Test minimum choices
    try {
      await questionGenerator.generateQuestion(1);
      console.log('Minimum choices test: FAILED (should throw error)');
    } catch (error) {
      console.log('Minimum choices test: PASSED (correctly threw error)');
    }
    
    // Test with many exclusions
    try {
      const allFlags = await flagService.getAllFlags();
      const manyExclusions = allFlags.slice(0, allFlags.length - 5).map(f => f.code);
      const limitedQuestion = await questionGenerator.generateQuestion(4, manyExclusions);
      console.log('Many exclusions test: PASSED');
      console.log(`  Generated with ${manyExclusions.length} exclusions`);
      console.log(`  Result: ${limitedQuestion.correctCountry.name}`);
    } catch (error) {
      console.log(`Many exclusions test: FAILED - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    console.log('\n=== All Tests Completed ===');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// CLI execution
if (require.main === module) {
  testQuestionGeneration()
    .then(() => {
      console.log('Testing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Testing failed:', error);
      process.exit(1);
    });
}