#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Analyze player_auth_input packets from JSON logs
 * Extracts observed values and ranges for all fields
 */

function analyzePackets() {
  const logFile = path.join(__dirname, '../docs/log_samples/player_auth_inputs.json');
  
  if (!fs.existsSync(logFile)) {
    console.error('Log file not found:', logFile);
    process.exit(1);
  }

  console.log('Reading log file...');
  const logContent = fs.readFileSync(logFile, 'utf8');
  const lines = logContent.trim().split('\n');
  
  console.log(`Found ${lines.length} log entries`);
  
  const packets = [];
  const errors = [];
  
  // Parse each line as JSON
  lines.forEach((line, index) => {
    try {
      const entry = JSON.parse(line);
      if (entry.packet && entry.packet.name === 'player_auth_input') {
        packets.push(entry.packet.params);
      }
    } catch (error) {
      errors.push({ line: index + 1, error: error.message });
    }
  });
  
  console.log(`Successfully parsed ${packets.length} player_auth_input packets`);
  if (errors.length > 0) {
    console.log(`Encountered ${errors.length} parse errors`);
  }
  
  if (packets.length === 0) {
    console.error('No valid packets found');
    process.exit(1);
  }
  
  // Analysis results
  const analysis = {
    totalPackets: packets.length,
    fields: {}
  };
  
  // Helper function to analyze a field
  function analyzeField(fieldPath, value) {
    if (!analysis.fields[fieldPath]) {
      analysis.fields[fieldPath] = {
        type: typeof value,
        values: [], // Use array to preserve order
        uniqueValues: new Set(), // Keep Set for uniqueness checking
        isNumeric: false,
        min: null,
        max: null,
        count: 0
      };
    }
    
    const field = analysis.fields[fieldPath];
    field.count++;
    
    if (value !== null && value !== undefined) {
      const valueStr = JSON.stringify(value);
      
      // Add to ordered list if not already seen
      if (!field.uniqueValues.has(valueStr)) {
        field.values.push(value);
        field.uniqueValues.add(valueStr);
      }
      
      if (typeof value === 'number') {
        field.isNumeric = true;
        if (field.min === null || value < field.min) field.min = value;
        if (field.max === null || value > field.max) field.max = value;
      }
    }
  }
  
  // Helper function to recursively analyze nested objects
  function analyzeObject(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // Recursively analyze nested objects
        analyzeObject(value, fieldPath);
      } else {
        // Analyze primitive values
        analyzeField(fieldPath, value);
      }
    }
  }
  
  // Analyze all packets
  console.log('Analyzing packets...');
  packets.forEach((packet, index) => {
    if (index % 1000 === 0) {
      console.log(`Processed ${index}/${packets.length} packets`);
    }
    analyzeObject(packet);
  });
  
  // Convert Sets to Arrays and format results
  const results = {
    summary: {
      totalPackets: analysis.totalPackets,
      totalFields: Object.keys(analysis.fields).length,
      numericFields: 0,
      stringFields: 0,
      booleanFields: 0,
      objectFields: 0
    },
    fields: {}
  };
  
  for (const [fieldPath, field] of Object.entries(analysis.fields)) {
    const fieldResult = {
      type: field.type,
      count: field.count,
      uniqueValues: field.uniqueValues.size,
      isNumeric: field.isNumeric
    };
    
    if (field.isNumeric) {
      fieldResult.range = {
        min: field.min,
        max: field.max
      };
      results.summary.numericFields++;
    } else if (field.type === 'string') {
      results.summary.stringFields++;
    } else if (field.type === 'boolean') {
      results.summary.booleanFields++;
    } else if (field.type === 'object') {
      results.summary.objectFields++;
    }
    
    // Use all ordered values without truncation
    fieldResult.values = field.values;
    
    results.fields[fieldPath] = fieldResult;
  }
  
  // Sort fields by path for better readability
  const sortedFields = {};
  Object.keys(results.fields).sort().forEach(key => {
    sortedFields[key] = results.fields[key];
  });
  results.fields = sortedFields;
  
  return results;
}

// Generate detailed report
function generateReport(analysis) {
  console.log('\n' + '='.repeat(80));
  console.log('PLAYER_AUTH_INPUT PACKET ANALYSIS REPORT');
  console.log('='.repeat(80));
  
  console.log(`\nSUMMARY:`);
  console.log(`- Total packets analyzed: ${analysis.summary.totalPackets}`);
  console.log(`- Total unique fields: ${analysis.summary.totalFields}`);
  console.log(`- Numeric fields: ${analysis.summary.numericFields}`);
  console.log(`- String fields: ${analysis.summary.stringFields}`);
  console.log(`- Boolean fields: ${analysis.summary.booleanFields}`);
  console.log(`- Object fields: ${analysis.summary.objectFields}`);
  
  console.log(`\nFIELD ANALYSIS:`);
  console.log('-'.repeat(80));
  
  for (const [fieldPath, field] of Object.entries(analysis.fields)) {
    console.log(`\n${fieldPath}:`);
    console.log(`  Type: ${field.type}`);
    console.log(`  Count: ${field.count}/${analysis.summary.totalPackets} packets`);
    console.log(`  Unique values: ${field.uniqueValues}`);
    
    if (field.isNumeric) {
      console.log(`  Range: ${field.range.min} to ${field.range.max}`);
    }
    
    console.log(`  Values: [${field.values.join(', ')}]`);
  }
  
  // Generate JSON output for programmatic use
  const jsonOutput = {
    summary: analysis.summary,
    fields: Object.fromEntries(
      Object.entries(analysis.fields).map(([path, field]) => [
        path,
        {
          ...field,
          values: field.values || [], // Use ordered values array directly
          uniqueValues: field.uniqueValues.size // Convert Set size to number
        }
      ])
    )
  };
  
  const outputFile = path.join(__dirname, 'packet_analysis.json');
  fs.writeFileSync(outputFile, JSON.stringify(jsonOutput, null, 2));
  console.log(`\nDetailed JSON analysis saved to: ${outputFile}`);
}

// Main execution
try {
  const analysis = analyzePackets();
  generateReport(analysis);
} catch (error) {
  console.error('Analysis failed:', error.message);
  process.exit(1);
}