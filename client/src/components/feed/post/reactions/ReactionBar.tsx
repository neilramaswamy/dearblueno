import "./ReactionBar.css";
import ReactionButton from "./ReactionButton";
import AngryIcon from "../../../../images/angry.svg";
import AngryBWIcon from "../../../../images/angryBW.svg";
import CryIcon from "../../../../images/cry.svg";
import CryBWIcon from "../../../../images/cryBW.svg";
import HeartIcon from "../../../../images/heart.svg";
import HeartBWIcon from "../../../../images/heartBW.svg";
import LaughIcon from "../../../../images/laugh.svg";
import LaughBWIcon from "../../../../images/laughBW.svg";
import LikeIcon from "../../../../images/like.svg";
import LikeBWIcon from "../../../../images/likeBW.svg";
import SurpriseIcon from "../../../../images/surprise.svg";
import SurpriseBWIcon from "../../../../images/surpriseBW.svg";
import { useEffect, useState, useMemo } from "react";
import IUser from "../../../../types/IUser";
import { reactToComment, reactToPost } from "../../../../gateways/PostGateway";

type ReactionBarProps = {
  user: IUser | undefined;
  type: "comment" | "post";
  reactions: string[][];
  postNumber: number;
  commentNumber: number | undefined;
};

function ReactionBar(props: ReactionBarProps) {
  const [likeCount, setLikeCount] = useState(
    props.reactions[0] ? props.reactions[0].length : 0
  );
  const [heartCount, setHeartCount] = useState(
    props.reactions[1] ? props.reactions[1].length : 0
  );
  const [laughCount, setLaughCount] = useState(
    props.reactions[2] ? props.reactions[2].length : 0
  );
  const [cryCount, setCryCount] = useState(
    props.reactions[3] ? props.reactions[3].length : 0
  );
  const [angryCount, setAngryCount] = useState(
    props.reactions[4] ? props.reactions[4].length : 0
  );
  const [surpriseCount, setSurpriseCount] = useState(
    props.reactions[5] ? props.reactions[5].length : 0
  );
  const reactionCounts = useMemo(
    () => [
      likeCount,
      heartCount,
      laughCount,
      cryCount,
      angryCount,
      surpriseCount,
    ],
    [likeCount, heartCount, laughCount, cryCount, angryCount, surpriseCount]
  );
  const countUpdaters = useMemo(
    () => [
      setLikeCount,
      setHeartCount,
      setLaughCount,
      setCryCount,
      setAngryCount,
      setSurpriseCount,
    ],
    [
      setLikeCount,
      setHeartCount,
      setLaughCount,
      setCryCount,
      setAngryCount,
      setSurpriseCount,
    ]
  );
  const icons = useMemo(
    () => [
      [LikeIcon, LikeBWIcon],
      [HeartIcon, HeartBWIcon],
      [LaughIcon, LaughBWIcon],
      [CryIcon, CryBWIcon],
      [AngryIcon, AngryBWIcon],
      [SurpriseIcon, SurpriseBWIcon],
    ],
    []
  );
  const [showIcons, setShowIcons] = useState(false);
  const [nonZeroOrder, setNonZeroOrder] = useState<number[]>([]);
  const [zeroOrder, setZeroOrder] = useState([0, 1, 2, 3, 4, 5]); // These arrays are the real-time order and state of the reactions

  const [nonZeroOrderDisplay, setNonZeroOrderDisplay] = useState<number[]>([]);
  const [zeroOrderDisplay, setZeroOrderDisplay] = useState([0, 1, 2, 3, 4, 5]); // these arrays are the display order and state of the reactions, that is updated on leave
  const [showReactText, setShowReactText] = useState<boolean>(
    reactionCounts.every((count) => count === 0)
  );

  useEffect(() => {
    for (let i = 0; i < 6; i++) {
      countUpdaters[i](props.reactions[i] ? props.reactions[i].length : 0);
    }
  }, [props.reactions, countUpdaters]);

  const showAll = () => {
    setShowIcons(true);
  };

  const hideAll = () => {
    setShowIcons(false);
    setNonZeroOrderDisplay(nonZeroOrder);
    setZeroOrderDisplay(zeroOrder);
  };

  // update non-display orders when the user clicks on a reaction button
  useEffect(() => {
    for (let i = 0; i < 6; i++) {
      if (reactionCounts[i] > 0 && !nonZeroOrder.includes(i)) {
        setNonZeroOrder((n) => [...n, i]);
        setZeroOrder((z) => z.filter((x) => x !== i));
      }
    }
    setNonZeroOrder((n) => n.sort((a, b) => a - b));
  }, [
    likeCount,
    heartCount,
    laughCount,
    cryCount,
    angryCount,
    surpriseCount,
    reactionCounts,
    nonZeroOrder,
  ]);

  useEffect(() => {
    setShowReactText(reactionCounts.every((count) => count === 0));
  }, [reactionCounts]);

  const incrementReactionCount = (reaction: number) => {
    return () => {
      if (props.user) {
        if (props.reactions[reaction]?.includes(props.user._id)) {
          props.reactions[reaction] = props.reactions[reaction].filter(
            (id) => id !== props.user?._id
          );
          countUpdaters[reaction](props.reactions[reaction].length);
          if (props.type === "post") {
            reactToPost(props.postNumber, reaction + 1, false);
          } else {
            if (props.commentNumber) {
              reactToComment(
                props.postNumber,
                props.commentNumber,
                reaction + 1,
                false
              );
            }
          }
        } else {
          if (props.reactions[reaction]) {
            props.reactions[reaction] = [
              ...props.reactions[reaction],
              props.user._id,
            ];
          } else {
            props.reactions[reaction] = [props.user._id];
          }
          countUpdaters[reaction](props.reactions[reaction].length);
          if (props.type === "post") {
            reactToPost(props.postNumber, reaction + 1, true);
          } else {
            if (props.commentNumber) {
              reactToComment(
                props.postNumber,
                props.commentNumber,
                reaction + 1,
                true
              );
            }
          }
        }
      }
    };
  };

  return (
    <div
      className="ReactionBar"
      onMouseOver={() => {
        if (!showReactText) {
          showAll();
        }
      }}
      onMouseLeave={() => {
        if (reactionCounts.every((count) => count === 0)) {
          setShowReactText(true);
        }
        hideAll();
      }}
    >
      {showReactText && (
        <p
          className="ReactText"
          onClick={() => {
            setShowReactText(false);
            showAll();
          }}
        >
          react
        </p>
      )}
      {nonZeroOrderDisplay.map((reaction) => {
        return (
          <ReactionButton
            type={props.type}
            key={reaction}
            images={icons[reaction]}
            count={reactionCounts[reaction]}
            showIcons={true}
            countSetter={countUpdaters[reaction]}
            handleClick={incrementReactionCount(reaction)}
          ></ReactionButton>
        );
      })}
      {zeroOrderDisplay.map((reaction) => {
        return (
          <ReactionButton
            type={props.type}
            key={reaction + 6}
            images={icons[reaction]}
            count={reactionCounts[reaction]}
            showIcons={showIcons}
            countSetter={countUpdaters[reaction]}
            handleClick={incrementReactionCount(reaction)}
          ></ReactionButton>
        );
      })}
    </div>
  );
}

export default ReactionBar;
