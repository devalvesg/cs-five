// Mantém uma schedule ESTÁVEL entre rebuilds.
//
// Problema: o app escolhe o puzzle do dia por POSIÇÃO no array
// (schedule[index(data)]). Se um rebuild reordena/redimensiona o array (refresh
// de dados, mais conteúdo), TODO dia passado muda de puzzle — quebraria streak,
// compartilhamento e a noção de "um puzzle fixo por dia" pós-lançamento.
//
// Solução: congela a posição de cada entrada já existente (mesma identidade →
// mesmo slot, conteúdo refrescado da fonte atual), substitui NO LUGAR as que
// ficaram inválidas, e ANEXA o conteúdo novo no fim. Crescer/refrescar o dataset
// só adiciona dias futuros; nunca mexe nos já fixados.
import { existsSync, readFileSync } from "node:fs";

export function loadExisting(path) {
  try { return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : []; }
  catch { return []; }
}

/**
 * @param existing  schedule atual (ordem a preservar)
 * @param candidates conjunto válido atual, em ordem canônica (p/ os novos)
 * @param idOf       identidade estável de uma entrada (assinatura/chave)
 */
export function stabilize(existing, candidates, idOf) {
  const candById = new Map(candidates.map((c) => [idOf(c), c]));
  const used = new Set();
  const result = [];
  const holes = []; // posições de entradas que ficaram inválidas (substituir no lugar)
  for (const old of existing) {
    const id = idOf(old);
    if (candById.has(id)) { result.push(candById.get(id)); used.add(id); }
    else { holes.push(result.length); result.push(null); }
  }
  const remaining = candidates.filter((c) => !used.has(idOf(c)));
  let ri = 0;
  for (const h of holes) if (ri < remaining.length) { result[h] = remaining[ri]; used.add(idOf(remaining[ri])); ri++; }
  for (; ri < remaining.length; ri++) result.push(remaining[ri]);
  return result.filter((x) => x != null); // remove buracos sem reposição (raro)
}
