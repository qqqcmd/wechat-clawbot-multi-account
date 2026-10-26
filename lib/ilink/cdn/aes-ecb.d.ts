/** Encrypt buffer with AES-128-ECB (PKCS7 padding is default). */
export declare function encryptAesEcb(plaintext: Buffer, key: Buffer): Buffer;
/** Decrypt buffer with AES-128-ECB (PKCS7 padding). */
export declare function decryptAesEcb(ciphertext: Buffer, key: Buffer): Buffer;
/** Compute AES-128-ECB ciphertext size (PKCS7 padding to 16-byte boundary). */
export declare function aesEcbPaddedSize(plaintextSize: number): number;
//# sourceMappingURL=aes-ecb.d.ts.map