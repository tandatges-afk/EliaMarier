# Starting a new AI conversation for Élia Marier

## Important limitation

Putting these files in a local folder does **not** automatically transmit them to a new ChatGPT chat. They become available to future repo-aware coding agents when the relevant branch is committed/pushed and the agent opens that repo. In ChatGPT, attach the files or repository ZIP, connect a supported GitHub integration if available, or provide a repository URL and ask the assistant to actually open the files. A URL without access is not proof that the files were read.

## Copy-paste this to the new conversation

> Tôi muốn tiếp tục dự án **Élia Marier V7** (không phải GU hoặc Amorri). Hãy mở repository/ZIP Élia mà tôi cung cấp và **đọc đầy đủ ba file gốc** `AGENTS.md`, `CLAUDE.md`, `docs/AI_HANDOFF.md` trước khi phân tích hoặc sửa code. Kiểm tra branch, git status và source hiện tại; đừng chỉ dựa vào handoff nếu code đã thay đổi. Tiếp tục từ lỗi/QA đang được ghi ở `docs/AI_HANDOFF.md`. Không push `main` hoặc dùng Firebase production khi chưa được tôi cho phép. Nếu không truy cập được repository, hãy nói rõ và yêu cầu tôi đính kèm file.

## Make the record permanent

After installing these files in the actual repo, review `git status` and commit the four documentation files. To make them visible from a fresh machine/agent, push the resulting commit to a remote branch that future agents can access. **Do not push to `main` automatically:** this project may deploy on main. If files are only local/untracked, other conversations and agents cannot be assumed to see them.
