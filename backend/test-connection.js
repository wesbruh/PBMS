// CREATED TEST FILE TO JUST TO TEST YOUR SETUP AND CONNECTION TO REMOTE DATABASE

import { createClient } from '@supabase/supabase-js'
import dotenv from "dotenv";
import process from "node:process"
dotenv.config();

const supabase = createClient(
    process.env.URL,
    process.env.SERVICE_ROLE_KEY
)

async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .limit(1)
      
    
    if (error) {
      console.error('Connection failed:', error)
    } else {
      console.log('SUCCESSFULLY CONNECTED TO REMOTE DB PROJECT!')
      console.log('Data:', data)
    }
  } catch (err) {
    console.error('Error:', err)
  }
}

testConnection()