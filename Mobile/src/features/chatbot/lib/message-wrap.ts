export const USER_QUESTION_MARKER = '[CÂU HỎI]';
export const CONTEXT_BLOCK_MARKER = '[DỮ LIỆU THỰC TẾ';

const MAX_MESSAGE_CHARS = 2000;
const MAX_CONTEXT_CHARS = 1200;

export function wrapMessageWithContext(context: string, userQuestion: string): string {
  const question = userQuestion.trim();
  let contextBlock = context.trim();
  if (contextBlock.length > MAX_CONTEXT_CHARS) {
    contextBlock = `${contextBlock.slice(0, MAX_CONTEXT_CHARS - 1)}…`;
  }

  let wrapped = `${CONTEXT_BLOCK_MARKER} — dùng để trả lời, không copy nguyên khối]\n${contextBlock}\n${USER_QUESTION_MARKER}\n${question}`;

  if (wrapped.length > MAX_MESSAGE_CHARS) {
    const budget = MAX_MESSAGE_CHARS - question.length - USER_QUESTION_MARKER.length - 80;
    const trimmedContext =
      budget > 200 ? contextBlock.slice(0, budget) : 'Dữ liệu quá dài, trả lời theo câu hỏi chung.';
    wrapped = `${CONTEXT_BLOCK_MARKER}]\n${trimmedContext}\n${USER_QUESTION_MARKER}\n${question}`;
  }

  return wrapped.slice(0, MAX_MESSAGE_CHARS);
}

export function getUserMessageDisplayText(content: string): string {
  const markerIndex = content.indexOf(USER_QUESTION_MARKER);
  if (markerIndex === -1) {
    return content;
  }
  return content.slice(markerIndex + USER_QUESTION_MARKER.length).trim() || content;
}
