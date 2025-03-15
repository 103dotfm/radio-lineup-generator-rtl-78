
import { z } from "zod";

export const databaseSchema = z.object({
  databaseType: z.enum(["supabase", "local"]),
  host: z.string().optional(),
  port: z.string().optional(),
  database: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

export type DatabaseFormValues = z.infer<typeof databaseSchema>;
