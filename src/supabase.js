import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jzpmtqpbyigzwurkqowt.supabase.co";
const supabaseKey = "sb_publishable_J4C5wyzsr4yevnzp-mrZ3Q_Cz1u5YLF";

export const supabase = createClient(supabaseUrl, supabaseKey);