type CloseCapableNavigation = {
  canGoBack: () => boolean;
  goBack: () => void;
  replace: (name: 'MainTabs') => void;
};

/**
 * Close a screen that may be the ONLY entry in the stack. Deep links and
 * notification taps build a navigation state containing just the linked screen
 * (and LinkedMoment then replace()s itself with Notes), so goBack() there is a
 * silent no-op and the user is trapped. Fall back to the main tabs instead.
 */
export function goBackOrHome(navigation: CloseCapableNavigation) {
  if (navigation.canGoBack()) {
    navigation.goBack();
  } else {
    navigation.replace('MainTabs');
  }
}
