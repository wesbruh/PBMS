jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ mocked: true }))
}));

import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../../src/lib/supabaseClient.js';

describe('supabaseClient', () => {
  test('exports supabase client', () => {
    expect(supabase).toBeDefined();
  });

  test('calls createClient', () => {
    expect(createClient).toHaveBeenCalled();
  });
});