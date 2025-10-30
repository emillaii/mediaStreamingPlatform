import { useState } from "react";

export function ImageWithFallback(props) {
  const { onError, ...rest } = props;
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return null;
  }

  return (
    <img
      {...rest}
      onError={(event) => {
        setHasError(true);
        if (onError) {
          onError(event);
        }
      }}
    />
  );
}
