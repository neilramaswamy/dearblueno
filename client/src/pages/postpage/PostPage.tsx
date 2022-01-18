import "./PostPage.css";
import Header from "../../components/header/Header";
import IUser from "../../types/IUser";
import IPost from "../../types/IPost";
import { useParams } from "react-router-dom";
import { getPost } from "../../gateways/PostGateway";
import { useEffect, useState } from "react";
import Post from "../../components/feed/post/Post";

interface PostProps {
  user?: IUser;
}

function PostPage(props: PostProps) {
  const { user } = props;
  const { postNumber } = useParams();
  const [post, setPost] = useState<IPost>();

  useEffect(() => {
    getPost(Number(postNumber)).then((response) => {
      if (response.success && response.payload) {
        setPost(response.payload);
      } else {
        console.log(response.message);
      }
    });
  }, [postNumber]);

  return (
    <>
      <Header user={user} moderatorView={false} />
      <div className="PostPage">
        {post && (
          <Post
            user={props.user}
            _id={post._id}
            postNumber={post.postNumber}
            postBody={post.content}
            postDate={new Date(post.approvedTime)}
            comments={post.comments}
            reactions={post.reactions}
            needsReview={post.needsReview}
          />
        )}
      </div>
    </>
  );
}

export default PostPage;
