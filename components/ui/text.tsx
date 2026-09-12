import React from "react";

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  children: React.ReactNode;
}

const Text = ({
  as: Component = "span",
  children,
  className,
  ...props
}: TextProps) => {
  return (
    <Component className={className} {...props}>
      {children}
    </Component>
  );
};

export default Text;
