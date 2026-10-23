/**
 * Whether a gamepad press may try to start the audio. Chrome refuses a start
 * that doesn't follow a user activation, and a gamepad press isn't one, so
 * where the browser can say (navigator.userActivation) only try when the page
 * has one. Where it can't, trying is harmless.
 */
export function padMayUnlock(nav: { userActivation?: { isActive: boolean } } | undefined): boolean {
  const activation = nav?.userActivation;
  return activation === undefined || activation.isActive;
}
