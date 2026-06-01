export type { CommentViewModel } from "@/types/domain";
export {
  createCommentRest as createComment,
  deleteCommentRest as deleteComment,
  listCommentsRest as listComments,
} from "@/server/data/comments-rest";
