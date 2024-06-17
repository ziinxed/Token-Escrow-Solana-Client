import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import { BinaryReader, BinaryWriter, serialize, deserialize } from "borsh";
import base58 from "bs58";
import BN from "bn.js";
import { Metaplex } from "@metaplex-foundation/js";
import { getMint } from "@solana/spl-token";

export function formatDecimal(numberString: string, decimal: number) {
  if (numberString.length > decimal) {
    let integerPart = numberString.slice(0, numberString.length - decimal);
    let decimalPart = numberString.slice(numberString.length - decimal);

    decimalPart = decimalPart.slice(0, 5);

    return integerPart + "." + decimalPart;
  } else {
    let integerPart = "0";
    let decimalPart = "0".repeat(decimal - numberString.length) + numberString;

    decimalPart = decimalPart.slice(0, 5);

    return integerPart + "." + decimalPart;
  }
}

export function decimalToIntegerString(decimalString: string, decimal: number) {
  if (!/^\d+(\.\d+)?$/.test(decimalString.trim())) {
    return "";
  }

  let pointIndex = decimalString.indexOf(".");

  if (pointIndex === -1) {
    return decimalString + "0".repeat(decimal);
  }

  let integerPart = decimalString.slice(0, pointIndex);
  let fractionalPart = decimalString.slice(pointIndex + 1);

  let combinedString = integerPart + fractionalPart.padEnd(decimal, "0");

  return combinedString;
}

type StringPublicKey = string;

export const extendBorsh = () => {
  (BinaryReader.prototype as any).readPubkey = function () {
    const reader = this as unknown as BinaryReader;
    const array = reader.readFixedArray(32);
    return new PublicKey(array);
  };

  (BinaryWriter.prototype as any).writePubkey = function (value: PublicKey) {
    const writer = this as unknown as BinaryWriter;
    writer.writeFixedArray(value.toBuffer());
  };

  (BinaryReader.prototype as any).readPubkeyAsString = function () {
    const reader = this as unknown as BinaryReader;
    const array = reader.readFixedArray(32);
    return base58.encode(array) as StringPublicKey;
  };

  (BinaryWriter.prototype as any).writePubkeyAsString = function (
    value: StringPublicKey
  ) {
    const writer = this as unknown as BinaryWriter;
    writer.writeFixedArray(base58.decode(value));
  };
};

extendBorsh();

export const escrowProgram = new PublicKey(
  "6U5mKXbakXsQWCA9FbccLXwaVmE9eivAMRswmVbmchJC"
);

export const systemProgram = SystemProgram.programId;
export const tokenProgram = TOKEN_PROGRAM_ID;
export const associatedProgram = ASSOCIATED_TOKEN_PROGRAM_ID;

export const getEscrowAddress = (authority: PublicKey, sellMint: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), authority.toBuffer(), sellMint.toBuffer()],
    escrowProgram
  )[0];
};

export interface TokenData {
  mint: string;
  amount: BN | BigInt | number | string;
  decimal: number;
  ticker?: string;
  img?: string;
}

export interface EscrowData {
  escrowKey: string;
  sellMint: string;
  sellMintDecimal: number;
  sellMintTicker?: string;
  sellMintImg?: string;
  sellAmount: string;
  buyMint: string;
  buyMintDecimal: number;
  buyMintTicker?: string;
  buyMintImg?: string;
  buyAmount: string;
  authority: string;
  receiveAccount: string;
}

export const getEscrowList = async (
  connection: Connection,
  pubkey?: PublicKey
): Promise<EscrowData[]> => {
  let opt = {};
  if (pubkey) {
    opt = {
      filters: [
        {
          memcmp: {
            offset: 1,
            bytes: pubkey
          }
        }
      ]
    };
  }
  return await connection
    .getProgramAccounts(escrowProgram, opt)
    .then((accounts) => {
      return Promise.all(
        accounts.map(async (account) => {
          const data = Escrow.fromBuffer(account.account.data);

          const metaplex = new Metaplex(connection);
          const sellMintDecimal = await getMint(
            connection,
            new PublicKey(data.sell_mint)
          ).then((res) => res.decimals);
          const buyMintDecimal = await getMint(
            connection,
            new PublicKey(data.buy_mint)
          ).then((res) => res.decimals);

          const sellMintImg = await metaplex
            .nfts()
            .findByMint({ mintAddress: new PublicKey(data.sell_mint) })
            .then((res) => {
              return res.json?.image;
            })
            .catch((e) => {
              console.log(e);
              return undefined;
            });

          const buyMintImg = await metaplex
            .nfts()
            .findByMint({ mintAddress: new PublicKey(data.buy_mint) })
            .then((res) => res.json?.image)
            .catch((e) => {
              return undefined;
            });

          return {
            escrowKey: account.pubkey.toBase58(),
            sellMint: data.sell_mint,
            sellMintDecimal: sellMintDecimal,
            sellMintImg: sellMintImg,
            buyMint: data.buy_mint,
            buyMintDecimal: buyMintDecimal,
            buyMintImg: buyMintImg,
            sellAmount: formatDecimal(
              data.sell_amount.toString(),
              sellMintDecimal
            ),
            buyAmount: formatDecimal(
              data.buy_amount.toString(),
              buyMintDecimal
            ),
            authority: data.authority,
            receiveAccount: data.receive_account
          };
        })
      );
    });
};

export enum EscrowInstruction {
  InitEscrow,
  Exchange
}

class Assignable {
  [keys: string]: any;
  constructor(properties: { [key: string]: any }) {
    Object.keys(properties).map((key) => {
      return (this[key] = properties[key]);
    });
  }
}

export class Escrow extends Assignable {
  toBuffer() {
    return Buffer.from(serialize(EscrowSchema, this));
  }

  static fromBuffer(buffer: Buffer) {
    return deserialize(EscrowSchema, Escrow, buffer);
  }
}

const EscrowSchema = new Map([
  [
    Escrow,
    {
      kind: "struct",
      fields: [
        ["is_initialized", "u8"],
        ["authority", "pubkeyAsString"],
        ["sell_mint", "pubkeyAsString"],
        ["buy_mint", "pubkeyAsString"],
        ["sell_amount", "u64"],
        ["buy_amount", "u64"],
        ["receive_account", "pubkeyAsString"],
        ["bump", "u8"]
      ]
    }
  ]
]);

export class Initialize extends Assignable {
  toBuffer() {
    return Buffer.from(serialize(InitializeSchema, this));
  }

  static fromBuffer(buffer: Buffer) {
    return deserialize(InitializeSchema, Initialize, buffer);
  }
}

const InitializeSchema = new Map([
  [
    Initialize,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["sell_amount", "u64"],
        ["buy_amount", "u64"]
      ]
    }
  ]
]);

export class Exchange extends Assignable {
  toBuffer() {
    return Buffer.from(serialize(ExchangeSchema, this));
  }

  static fromBuffer(buffer: Buffer) {
    return deserialize(ExchangeSchema, Initialize, buffer);
  }
}

const ExchangeSchema = new Map([
  [
    Exchange,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["sell_amount", "u64"],
        ["buy_amount", "u64"]
      ]
    }
  ]
]);
