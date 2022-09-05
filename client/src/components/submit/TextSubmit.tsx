import styles from "./TextSubmit.module.scss";
import GoogleFormOption from "./GoogleFormOption";
import { createPost } from "../../gateways/PostGateway";
import toast from "react-hot-toast";
import { Dispatch, SetStateAction } from "react";

interface TextSubmitProps {
  setSubmitted: Dispatch<SetStateAction<boolean>>;
}

function TextSubmit(props: TextSubmitProps) {
  const submitPost = (text: string) => {
    createPost(text)
      .then((response) => {
        if (response.success) {
          props.setSubmitted(true);
          toast.success("Post submitted for approval!");
        } else {
          toast.error(
            (response.message as unknown as { message: string }).message
          );
        }
      })
      .catch((error) => {
        console.error(error);
      });
  };

  return (
    <>
      <div className={styles.SubmitBox}>
        <div className={styles.PreSubmitContent}>
          <textarea
            placeholder="What's on your mind?"
            id="TextBox"
            className={styles.TextBox}
            name="TextBox"
            autoFocus={true}
          ></textarea>
          <div className={styles.SubmitBoxFooter}>
            <GoogleFormOption />
            <p
              className={styles.Submit}
              onClick={() => {
                const element = document.getElementById(
                  "TextBox"
                ) as HTMLTextAreaElement;
                submitPost(element.value);
              }}
            >
              submit
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default TextSubmit;
