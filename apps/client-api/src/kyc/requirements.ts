import { $Enums } from '@prisma/client';

export type FileRules = {
  maxSizeMB: number;
  allowedMime: string[];
  minResolution?: { width: number; height: number };
};

export const KYC_REQUIREMENTS = {
  requiredSets: [
    {
      name: 'primary_id',
      minSelect: 1,
      options: [
        {
          type: $Enums.KycDocType.PASSPORT,
          rules: { notExpired: true, minDaysToExpiry: 30 },
        },
        { type: $Enums.KycDocType.ID_CARD, rules: { notExpired: true } },
        {
          type: $Enums.KycDocType.DRIVER_LICENSE,
          rules: {
            notExpired: true,
            requiresBack: true,
          },
        },
      ],
    },
    {
      name: 'address_proof',
      minSelect: 1,
      options: [
        { type: $Enums.KycDocType.ADDRESS_PROOF, rules: { recentDays: 90 } }, // Utility bill <= 90 días
      ],
    },

    {
      name: 'liveness',
      minSelect: 1,
      options: [{ type: $Enums.KycDocType.SELFIE, rules: {} }],
    },
  ],
  fileRules: {
    maxSizeMB: 10,
    allowedMime: ['image/jpeg', 'image/png', 'application/pdf'],
    minResolution: { width: 1000, height: 1000 },
  } as FileRules,
};
