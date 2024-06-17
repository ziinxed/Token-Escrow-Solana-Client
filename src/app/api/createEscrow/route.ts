import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  MINT_SIZE,
  ACCOUNT_SIZE,
  createInitializeMint2Instruction,
  createAssociatedTokenAccountInstruction,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMintToCheckedInstruction,
  getMint
} from "@solana/spl-token";
import {
  PublicKey,
  Keypair,
  Connection,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY
} from "@solana/web3.js";
import {
  Metaplex,
  irysStorage,
  keypairIdentity
} from "@metaplex-foundation/js";
import {
  getEscrowAddress,
  Initialize,
  EscrowInstruction,
  decimalToIntegerString
} from "@/app/_solana/program";
import BN from "bn.js";

export const dynamic = "force-dynamic"; // defaults to auto
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pubkey = searchParams.get("pubkey");
    const sellMintAddress = searchParams.get("sellMint");
    const buyMintAddress = searchParams.get("buyMint");
    const sellAmount = searchParams.get("sellAmount");
    const buyAmount = searchParams.get("buyAmount");

    if (
      !pubkey ||
      !sellMintAddress ||
      !buyMintAddress ||
      !sellAmount ||
      !buyAmount
    ) {
      return Response.json({ error: "pubkey is required" }, { status: 400 });
    }

    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_ENDPOINT || "",
      "processed"
    );

    const sellMint = new PublicKey(sellMintAddress);
    const buyMint = new PublicKey(buyMintAddress);

    const authority = new PublicKey(pubkey);

    const authoritySellTokenAccount = getAssociatedTokenAddressSync(
      sellMint,
      authority
    );
    const authorityBuyTokenAccount = getAssociatedTokenAddressSync(
      buyMint,
      authority
    );

    const escrowAccount = getEscrowAddress(authority, sellMint);
    const escrowTokenAccount = getAssociatedTokenAddressSync(
      sellMint,
      escrowAccount,
      true
    );

    const systemProgram = SystemProgram.programId;
    const tokenProgram = TOKEN_PROGRAM_ID;
    const associatedProgram = ASSOCIATED_TOKEN_PROGRAM_ID;
    const escrowProgram = new PublicKey(
      "6U5mKXbakXsQWCA9FbccLXwaVmE9eivAMRswmVbmchJC"
    );

    const sellDecimal = await getMint(connection, new PublicKey(sellMint)).then(
      (res) => res.decimals
    );
    const buyDecimal = await getMint(connection, new PublicKey(buyMint)).then(
      (res) => res.decimals
    );

    const initEscrowIx = new TransactionInstruction({
      keys: [
        { pubkey: sellMint, isSigner: false, isWritable: false },
        {
          pubkey: buyMint,
          isSigner: false,
          isWritable: false
        },
        { pubkey: authority, isSigner: true, isWritable: true },
        {
          pubkey: authoritySellTokenAccount,
          isSigner: false,
          isWritable: true
        },
        {
          pubkey: authorityBuyTokenAccount,
          isSigner: false,
          isWritable: false
        },
        { pubkey: escrowAccount, isSigner: false, isWritable: true },
        { pubkey: escrowTokenAccount, isSigner: false, isWritable: true },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: systemProgram, isSigner: false, isWritable: false },
        { pubkey: tokenProgram, isSigner: false, isWritable: false },
        { pubkey: associatedProgram, isSigner: false, isWritable: false },
        { pubkey: escrowProgram, isSigner: false, isWritable: false }
      ],
      programId: escrowProgram,
      data: new Initialize({
        instruction: EscrowInstruction.InitEscrow,
        sell_amount: new BN(decimalToIntegerString(sellAmount, sellDecimal)),
        buy_amount: new BN(decimalToIntegerString(buyAmount, buyDecimal))
      }).toBuffer()
    });

    const tx = new Transaction();

    tx.add(initEscrowIx);

    const buyATAInfo = await connection.getAccountInfo(
      authorityBuyTokenAccount
    );

    if (buyATAInfo === null) {
      const createBuyATAIx = createAssociatedTokenAccountInstruction(
        authority,
        authorityBuyTokenAccount,
        authority,
        buyMint
      );

      tx.add(createBuyATAIx);
    }

    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    console.log(recentBlockhash);
    tx.recentBlockhash = recentBlockhash;
    tx.feePayer = authority;

    const serialized_tx = tx.serialize({ requireAllSignatures: false });
    const encoded_tx = Buffer.from(serialized_tx).toString("base64");

    return Response.json({ tx: encoded_tx });
  } catch (err) {
    console.log(err);
    return Response.json({ error: err }, { status: 500 });
  }
}
