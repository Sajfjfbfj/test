// Git 基本操作メモ
// 1. 最新の状態を取得
// git pull origin main
//
// 2. 変更をステージング（不要なファイルが含まれていないか git status で確認を推奨）
// git add .
//
// 3. コミット
// git commit -m "わかりやすいメッセージ"
//
// 4. 送信
// git push origin main
//
// ■ 100MB制限でエラーが出た時の直し方
// 1. git reset --soft HEAD~1  (コミットを1つ戻す)
// 2. git rm -r --cached .tmp.driveupload/ (巨大フォルダを対象外にする)
// 3. git commit -m "修正して再送"
// 4. git push origin main
//
// ■ それでもエラーが出る時のチェック項目
// ・git status を入力し、大きなファイルが「new file」に入っていないか見る
// ・「弓道基礎１.glb」自体が100MBを超えていないか確認（超えていたら Git LFS が必要）
// ・.gitignore ファイルの書き方が合っているか（ファイル名が .gitignore になっているか）
//
// ※ Google Driveなどの同期フォルダを使っていると .tmp.driveupload が勝手に作られるので注意
