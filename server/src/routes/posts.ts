import { Router } from "express";
import { body, param, query, validationResult } from "express-validator";
import User, { IUser } from "../models/User";
import { authCheck, modCheck, optionalAuth } from "../middleware/auth";
import Comment, { IComment } from "../models/Comment";
import Post from "../models/Post";

const postRouter = Router();

// GET request that gets 10 posts paginated in order of most recent (only approved posts)
postRouter.get(
  "/",
  query("page").optional().isInt({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const page = req.query?.page || 1;
    const posts = await Post.find({ approved: true })
      .sort({ postNumber: "descending" })
      .skip((page - 1) * 10)
      .limit(10)
      .select("-approvedBy")
      .populate("comments")
      .populate({
        path: "comments",
        populate: {
          path: "author",
          select: "name profilePicture badges",
        },
      });

    // don't include comments if they are not approved
    posts.forEach((post) => {
      post.comments = post.comments.filter((comment) => comment.approved);
    });

    res.send(posts);
  }
);

// GET request that gets 10 posts paginated in order of most recent (all posts)
// (Must be authenticated as a moderator)
postRouter.get(
  "/all",
  modCheck,
  query("page").optional().isInt({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const page = Number(req.query?.page) || 1;
    const posts = await Post.find()
      .sort({ postTime: "descending" })
      .skip((page - 1) * 10)
      .limit(10)
      .populate("comments")
      .populate({
        path: "comments",
        populate: {
          path: "author",
          select: "name profilePicture badges",
        },
      });
    res.send(posts);
  }
);

// GET request that gets 10 posts paginated in order of oldest (only posts that need review)
// (Must be authenticated as a moderator)
postRouter.get(
  "/mod-feed",
  modCheck,
  query("page").optional().isInt({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const page = Number(req.query?.page) || 1;
    const posts = await Post.find({ needsReview: true })
      .sort({ postTime: "ascending" })
      .skip((page - 1) * 10)
      .limit(10);
    res.send(posts);
  }
);

// GET request that gets 10 comments paginated in order of oldest (only comments that need review)
// (Must be authenticated as a moderator)
postRouter.get(
  "/mod-feed/comments",
  modCheck,
  query("page").optional().isInt({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const page = Number(req.query?.page) || 1;
    const comments = await Comment.find({ needsReview: true })
      .sort({ commentTime: "ascending" })
      .skip((page - 1) * 10)
      .limit(10)
      .populate({
        path: "author",
        select: "name profilePicture badges",
      })
      .populate("post")
      .populate({
        path: "parentComment",
        populate: {
          path: "author",
          select: "name profilePicture badges",
        },
      });
    res.send(comments);
  }
);

// GET request that searches for posts with an index query
postRouter.get(
  "/search",
  query("query").isString().isLength({ min: 3 }).isAscii(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty() || !req.query) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const searchQuery = req.query.query;
    const posts = await Post.find({
      approved: true,
      $text: { $search: searchQuery, $language: "en", $caseSensitive: false },
    })
      .limit(10)
      .select("-approvedBy")
      .populate("comments")
      .populate({
        path: "comments",
        populate: {
          path: "author",
          select: "name profilePicture badges",
        },
      });

    // don't include comments if they are not approved
    posts.forEach((post) => {
      post.comments = post.comments.filter((comment) => comment.approved);
    });

    res.send(posts);
  }
);

// GET request that gets the reactions of a post (only approved posts)
postRouter.get(
  "/:postNumber/reactions",
  param("postNumber").isInt({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty() || !req.params) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const postNumber = req.params.postNumber;
    const post = await Post.findOne({ postNumber })
      .select("reactions approved")
      .populate({
        path: "reactions",
        model: "User",
        select: "name",
      });
    if (!post || !post.approved) {
      res.status(404).send("Post not found");
      return;
    }

    res.send(post.reactions);
  }
);

// GET request that gets the reactions of a comment (only approved comments)
postRouter.get(
  "/:postNumber/comments/:commentNumber/reactions",
  param("postNumber").isInt({ min: 1 }),
  param("commentNumber").isInt({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty() || !req.params) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { postNumber, commentNumber } = req.params;
    const comment = await Comment.findOne({ commentNumber, postNumber })
      .select("reactions approved")
      .populate({
        path: "reactions",
        model: "User",
        select: "name",
      });
    if (!comment || !comment.approved) {
      res.status(404).send("Comment not found");
      return;
    }

    res.send(comment.reactions);
  }
);

// GET request that gets a single post by id (only approved posts)
postRouter.get("/:id", param("id").isInt({ min: 1 }), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty() || !req.params) {
    res.status(400).json({ errors: errors.array() });
    return;
  }

  const post = await Post.findOne({ postNumber: req.params.id })
    .select("-approvedBy")
    .populate("comments")
    .populate({
      path: "comments",
      populate: {
        path: "author",
        select: "name profilePicture badges",
      },
    });
  if (!post || !post.approved) {
    res.status(404).send("Post not found");
    return;
  }

  // don't include comments if they are not approved
  post.comments = post.comments.filter((comment) => comment.approved);

  res.send(post);
});

// POST request that creates a new post
postRouter.post(
  "/",
  optionalAuth,
  body("content").isString().trim().isLength({ min: 1, max: 5000 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const content = req.body.content;
    const user = req.user as IUser | undefined;
    const verifiedBrown = user?.verifiedBrown || false;
    const post = new Post({
      content,
      verifiedBrown,
    });
    await post.save();
    res.send(post);
  }
);

// PUT request that changes a post's approved status
// (Must be authenticated as a moderator)
postRouter.put(
  "/:id/approve",
  modCheck,
  body("approved").toBoolean(),
  body("contentWarning").trim().optional().isLength({ max: 100 }),
  param("id").isMongoId(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty() || !req.params) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).send("Post not found");
      return;
    }

    post.approved = req.body.approved;
    post.contentWarning = req.body.contentWarning;
    post.needsReview = false;
    post.approvedTime = new Date();
    post.approvedBy = (req.user as IUser)._id;
    if (!post.postNumber && post.approved) {
      post.postNumber =
        (await Post.countDocuments({
          postNumber: { $exists: true },
        })) + 1;
    }
    await post.save();
    res.send(post);
  }
);

// PUT request that reacts to a post
// (Must be authenticated)
postRouter.put(
  "/:id/react",
  authCheck,
  body("reaction").isInt({ min: 1, max: 6 }),
  body("state").toBoolean(),
  param("id").isInt({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty() || !req.params) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const post = await Post.findOne({ postNumber: Number(req.params.id) });
    if (!post) {
      res.status(404).send("Post not found");
      return;
    }

    const reaction = req.body.reaction;
    const state = req.body.state;
    const user = req.user as IUser;

    const reactions = post.reactions[reaction - 1] || [];
    if (state) {
      !reactions.includes(user._id) && reactions.push(user._id);
    } else {
      reactions.includes(user._id) &&
        reactions.splice(reactions.indexOf(user._id), 1);
    }
    post.reactions[reaction - 1] = reactions;
    await post.save();
    res.send(post);
  }
);

// POST request that creates a new comment
// (Must be authenticated)
postRouter.post(
  "/:id/comment",
  authCheck,
  body("content").isString().trim().isLength({ min: 1, max: 2000 }),
  body("parentId").isInt({ min: -1 }),
  body("anonymous").toBoolean(),
  param("id").isInt({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty() || !req.params) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const reqUser = req.user as IUser;
    const user = await User.findById(reqUser._id);
    if (!user) {
      res.status(404).send("User not found");
      return;
    }
    // Check if the user is banned
    if (user.bannedUntil && user.bannedUntil > new Date()) {
      res
        .status(403)
        .send(
          `User is banned until ${new Date(
            user.bannedUntil
          ).toLocaleDateString()}`
        );
      return;
    }

    const post = await Post.findOne({ postNumber: Number(req.params.id) });
    if (!post) {
      res.status(404).send("Post not found");
      return;
    }

    let parentComment;
    if (req.body.parentId !== -1) {
      parentComment = await Comment.findOne({
        commentNumber: req.body.parentId,
        post: post._id,
      });
      if (!parentComment || !parentComment.approved) {
        res.status(404).send("Parent comment not found");
        return;
      }
    }

    // If the comment is not anonymous, award the user some XP
    if (!req.body.anonymous) {
      user.xp += 2;
      await user.save();
    }

    const comment = new Comment({
      commentNumber: post.comments.length + 1,
      parentCommentNumber: req.body.parentId,
      parentComment: parentComment?._id,
      post: post._id,
      postNumber: post.postNumber,
      content: req.body.content,
      author: req.body.anonymous ? null : reqUser._id,
      needsReview: req.body.anonymous,
      approved: !req.body.anonymous,
    });
    await comment.save();
    post.comments.push(comment);
    await post.save();
    res.send(comment);
  }
);

// PUT request that changes a comment's approved status
// (Must be authenticated as a moderator)
postRouter.put(
  "/:id/comment/:commentId/approve",
  modCheck,
  body("approved").toBoolean(),
  param("id").isInt({ min: 1 }),
  param("commentId").isInt({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty() || !req.params) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const post = await Post.findOne({
      postNumber: Number(req.params.id),
    }).populate("comments");
    if (!post) {
      res.status(404).send("Post not found");
      return;
    }

    const comment = post.comments.find(
      (c: IComment) => c.commentNumber === parseInt(req.params?.commentId)
    );
    if (!comment) {
      res.status(404).send("Comment not found");
      return;
    }

    comment.approved = req.body.approved;
    comment.needsReview = false;
    await comment.save();
    res.send(comment);
  }
);

// PUT request that reacts to a comment
// (Must be authenticated)
postRouter.put(
  "/:id/comment/:commentId/react",
  authCheck,
  body("reaction").isInt({ min: 1, max: 6 }),
  body("state").toBoolean(),
  param("id").isInt({ min: 1 }),
  param("commentId").isInt({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty() || !req.params) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const post = await Post.findOne({
      postNumber: Number(req.params.id),
    }).populate("comments");
    if (!post) {
      res.status(404).send("Post not found");
      return;
    }

    const comment = post.comments.find(
      (c: IComment) => c.commentNumber === parseInt(req.params?.commentId)
    );
    if (!comment) {
      res.status(404).send("Comment not found");
      return;
    }

    const reaction = req.body.reaction;
    const state = req.body.state;
    const user = req.user as IUser;

    // If the commenter is not anonymous, award / take-away some XP from the commenter
    const commenter = comment.author;
    if (commenter && reaction <= 3) {
      await User.findByIdAndUpdate(commenter, {
        $inc: { xp: state ? 1 : -1 },
      });
    }

    const reactions = comment.reactions[reaction - 1] || [];
    if (state && !reactions.includes(user._id)) {
      reactions.push(user._id);
    } else if (reactions.includes(user._id)) {
      reactions.splice(reactions.indexOf(user._id), 1);
    }
    comment.reactions[reaction - 1] = reactions;
    await comment.save();
    res.send(comment);
  }
);

// DELETE request that deletes a comment
// (Must be authenticated)
postRouter.delete(
  "/:postNumber/comment/:commentNumber",
  authCheck,
  param("postNumber").isInt({ min: 1 }),
  param("commentNumber").isInt({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty() || !req.params) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const comment = await Comment.findOne({
      commentNumber: req.params.commentNumber,
      postNumber: req.params.postNumber,
    });
    if (!comment) {
      res.status(404).send("Comment not found");
      return;
    }

    const user = req.user as IUser;
    if (user._id.toString() !== comment.author.toString()) {
      res.status(403).send("You are not the author of this comment");
      return;
    }

    const childCommentCount = await Comment.countDocuments({
      parentComment: comment._id,
    });

    if (childCommentCount > 0) {
      // Replace the comment content with [deleted]
      comment.content = "[deleted]";
      comment.author = null;
      comment.needsReview = false;
    } else {
      // Mark the comment as unapproved and not needing review
      comment.approved = false;
      comment.needsReview = false;
    }

    await comment.save();

    // Take away previously awarded XP
    let xpDecr = -2;
    for (let i = 0; i < 3; i++) {
      xpDecr -= comment.reactions[i].length;
    }
    await User.findByIdAndUpdate(comment.author, {
      $inc: { xp: xpDecr },
    });

    res.send(comment);
  }
);

export default postRouter;
