import { argon2id, hash, verify } from 'argon2';

// One set of Argon2 settings for every password, whether set at sign-up, on
// accepting an invite or as a placeholder for a pending invite.
const PARAMETROS_ARGON = {
  type: argon2id,
  memoryCost: 2 ** 15,
  timeCost: 2,
  parallelism: 1,
};

export function gerarHashDeSenha(senha: string) {
  return hash(senha, PARAMETROS_ARGON);
}

export function conferirSenha(hashGuardado: string, senha: string) {
  return verify(hashGuardado, senha);
}
