import { Metaplex } from "@metaplex-foundation/js";
import { AccountClient, BN, Idl, Program, utils } from "@project-serum/anchor";
import { AllAccountsMap } from "@project-serum/anchor/dist/cjs/program/namespace/types";
import { AccountInfo, Connection, PublicKey } from "@solana/web3.js";

export const getAccountRent = (
  conn: Connection,
  acct: AccountClient
): Promise<number> => {
  return conn.getMinimumBalanceForRentExemption(acct.size);
};

export const getLamports = async (
  conn: Connection,
  acct: PublicKey
): Promise<number | undefined> => {
  return (await conn.getAccountInfo(acct))?.lamports;
};

export const hexCode = (decCode: number) => "0x" + decCode.toString(16);

export const removeNullBytes = (str: string) => {
  return str
    .split("")
    .filter((char) => char.codePointAt(0))
    .join("");
};

type Decoder = (buffer: Buffer) => any;
export type DiscMap<T extends Idl> = Record<
  string,
  { decoder: Decoder; name: keyof AllAccountsMap<T> }
>;

export const genDiscToDecoderMap = <T extends Idl>(
  program: Program<T>
): DiscMap<T> => {
  return Object.fromEntries(
    program.idl.accounts?.map((acc) => {
      const name = acc.name as keyof AllAccountsMap<T>;
      const capName = name.at(0)!.toUpperCase() + name.slice(1);

      return [
        utils.sha256.hash(`account:${capName}`).slice(0, 8),
        {
          decoder: (buffer: Buffer) =>
            program.coder.accounts.decode(name, buffer),
          name,
        },
      ];
    }) ?? []
  );
};

export const decodeAcct = <T extends Idl>(
  acct: AccountInfo<Buffer>,
  discMap: DiscMap<T>
) => {
  const disc = acct.data.toString("hex").slice(0, 8);
  const meta = discMap[disc];
  if (!meta) return null;

  return {
    name: meta.name,
    account: meta.decoder(acct.data),
  };
};

export const fetchNft = async (conn: Connection, mint: PublicKey) => {
  const mplex = new Metaplex(conn);
  return await mplex
    .nfts()
    .findByMint({ mintAddress: mint, loadJsonMetadata: true });
};

//#region Stringify function.

export const stringifyPKsAndBNs = (i: any) => {
  if (_isPk(i)) {
    return (<PublicKey>i).toBase58();
  } else if (i instanceof BN) {
    return i.toString();
  } else if (_parseType(i) === "array") {
    return _stringifyPKsAndBNInArray(i);
  } else if (_parseType(i) === "object") {
    return _stringifyPKsAndBNsInObject(i);
  }
  return i;
};

const _isPk = (obj: any): boolean => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof obj["toBase58"] === "function"
  );
};

const _stringifyPKsAndBNsInObject = (o: any) => {
  const newO = { ...o };
  for (const [k, v] of Object.entries(newO)) {
    if (_isPk(v)) {
      newO[k] = (<PublicKey>v).toBase58();
    } else if (v instanceof BN) {
      newO[k] = (v as BN).toString();
    } else if (_parseType(v) === "array") {
      newO[k] = _stringifyPKsAndBNInArray(v as any);
    } else if (_parseType(v) === "object") {
      newO[k] = _stringifyPKsAndBNsInObject(v);
    } else {
      newO[k] = v;
    }
  }
  return newO;
};

const _stringifyPKsAndBNInArray = (a: any[]): any[] => {
  const newA = [];
  for (const i of a) {
    if (_isPk(i)) {
      newA.push(i.toBase58());
    } else if (i instanceof BN) {
      newA.push(i.toString());
    } else if (_parseType(i) === "array") {
      newA.push(_stringifyPKsAndBNInArray(i));
    } else if (_parseType(i) === "object") {
      newA.push(stringifyPKsAndBNs(i));
    } else {
      newA.push(i);
    }
  }
  return newA;
};

const _parseType = <T>(v: T): string => {
  if (v === null || v === undefined) {
    return "null";
  }
  if (typeof v === "object") {
    if (v instanceof Array) {
      return "array";
    }
    if (v instanceof Date) {
      return "date";
    }
    return "object";
  }
  return typeof v;
};

export const isNullLike = <T>(v: T | null | undefined): v is null | undefined =>
  v === null || v === undefined;

// #endregion

export const SECONDS = 1000;
export const MINUTES = 60 * SECONDS;
export const HOURS = 60 * MINUTES;
export const DAYS = 24 * HOURS;

export { PROGRAM_ID as TMETA_PROG_ID } from "@metaplex-foundation/mpl-token-metadata";
export { PROGRAM_ID as AUTH_PROG_ID } from "@metaplex-foundation/mpl-token-auth-rules";
