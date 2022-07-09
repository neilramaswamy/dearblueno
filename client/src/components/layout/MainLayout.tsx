import PageHeader from "./PageHeader";
import PageSidebar from "./PageSidebar";
import HeaderAndPage from "./HeaderAndPage";
import Page from "./Page";
import { useIsMobile } from "hooks/is-mobile";

type MainLayoutProps = {
  title?: string;
  header?: React.ReactNode;
  page?: React.ReactNode;
  sidebar?: React.ReactNode;
};

export default function MainLayout(props: MainLayoutProps) {
  const isMobile = useIsMobile();
  return (
    <>
      <HeaderAndPage>
        <PageHeader title={props.title} sidebar={props.sidebar}>
          {props.header}
        </PageHeader>
        <Page>{props.page}</Page>
      </HeaderAndPage>
      <PageSidebar>{props.sidebar}</PageSidebar>
    </>
  );
}
