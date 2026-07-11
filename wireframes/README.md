# 業務フロー ワイヤーフレーム

CLI の導入体験（DF-101: scaffold→doctor）と導入後の1日1スプリント運用サイクル（DF-201）を
[flow-wireframe](https://github.com/yyamamoto95/flow-wireframe) で見える化したもの。

| ファイル | 役割 |
|---------|------|
| `devframework.flow.json` | フロー定義（これが編集対象。`$schema` によりエディタ補完が効く） |
| `devframework.wireframe.html` | 生成物（ブラウザで直接開ける静的HTML。JSなし・単一ファイル） |

## 再生成の方法

```bash
npx flow-wireframe build wireframes/devframework.flow.json -o wireframes/devframework.wireframe.html
```

定義（JSON）を変更したら HTML を再生成してコミットする。出力は決定的（同じ定義→同じHTML）。

## フロー ID の規約

- `DF-1xx`: 導入系（開発者が主体）
- `DF-2xx`: 運用系（開発者・AIエージェント・システムの協調。画面を持たない処理ステップを含む）
