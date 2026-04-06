import { z } from "zod";

const optionalString = z.string().optional().or(z.literal("")).transform((v) => v || undefined);

export const uploadedDocSchema = z.object({
  type: z.string().min(1),
  url: z.string().min(1),
  name: z.string().optional(),
});

export const customerCreateSchema = z.object({
  fullName: z.string().min(2),
  fatherOrHusband: optionalString,
  mobile: z.string().min(7),
  altMobile: optionalString,
  aadhaar: z.string().regex(/^\d{12}$/, "Aadhaar must be 12 digits").optional()
    .or(z.literal("")).transform((v) => v || undefined),
  panOrTaxId: optionalString,
  dob: optionalString,
  gender: optionalString,
  maritalStatus: optionalString,
  occupation: optionalString,
  monthlyIncome: z.coerce.number().nonnegative().optional(),
  currentAddress: z.string().min(2),
  permanentAddress: optionalString,
  guarantorName: optionalString,
  guarantorMobile: optionalString,
  guarantorRelation: optionalString,
  referenceName: optionalString,
  referenceMobile: optionalString,
  bankName: optionalString,
  bankAccount: optionalString,
  ifsc: optionalString,
  nomineeName: optionalString,
  nomineeRelation: optionalString,
  branchId: z.string().min(1),
  photoUrl: optionalString,
  documents: z.array(uploadedDocSchema).optional(),
});

export const customerUpdateSchema = customerCreateSchema.partial();

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;
