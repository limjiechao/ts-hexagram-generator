/**
 * A scripture as an abstract text, independent of any Edition, each with its
 * own Citation scheme: the 周易 經 (`zhouyi`), the 彖傳 (`tuan`), 大象
 * (`daxiang`), 小象 (`xiaoxiang`) and 文言 (`wenyan`) of the 十翼, and the
 * 焦氏易林 (`yilin`). The ids are those of the `/works/…` URLs (ADR-0038).
 */
export type Work =
  | 'zhouyi'
  | 'tuan'
  | 'daxiang'
  | 'xiaoxiang'
  | 'wenyan'
  | 'yilin'
