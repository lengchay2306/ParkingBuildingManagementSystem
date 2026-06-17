import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { EyeCoverMode } from '@/components/sign-mascot';
import {
  emailLengthToLookX,
  getBusyMascotLines,
  getEmailFocusLines,
  getEmptyEmailLines,
  getForgotPasswordLines,
  getGoogleUnavailableLines,
  getIdleMascotLines,
  getInvalidEmailLines,
  getInvalidNameLines,
  getInvalidPhoneLines,
  getLoginWelcomeLines,
  getPasswordCoverLines,
  getPasswordPeekLines,
  getPasswordTooShortLines,
  getSignupNameLines,
  getSignupPhoneLines,
  getSignupWelcomeLines,
  isValidEmail,
  isValidPhone,
  mapAuthErrorToMascotSpeech,
  mapRegisterErrorToMascotSpeech,
  pickRandomLine,
  type MascotSpeech,
} from '@/lib/sign-mascot-utils';

type FocusField =
  | 'loginEmail'
  | 'loginPassword'
  | 'signupFullName'
  | 'signupEmail'
  | 'signupPhone'
  | 'signupPassword'
  | null;

type Params = {
  t: (vi: string, en: string) => string;
  focusedField: FocusField;
  activeView: 'login' | 'signup';
  loginEmail: string;
  loginPassword: string;
  signupEmail: string;
  signupPhone: string;
  signupPassword: string;
  signupFullName: string;
  isSigningIn: boolean;
  isSigningUp: boolean;
};

const SPEECH_MS = 4200;
const ERROR_SPEECH_MS = 5400;
const EMAIL_VALIDATE_DEBOUNCE_MS = 500;
const PASSWORD_TYPING_PAUSE_MS = 520;

export function useSignMascotInteraction({
  t,
  focusedField,
  activeView,
  loginEmail,
  loginPassword,
  signupEmail,
  signupPhone,
  signupPassword,
  signupFullName,
  isSigningIn,
  isSigningUp,
}: Params) {
  const [mascotSpeech, setMascotSpeech] = useState<MascotSpeech | null>(null);
  const [isTypingPassword, setIsTypingPassword] = useState(false);

  const speechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailValidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const passwordTypingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const randomIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const passwordFieldRef = useRef<FocusField>(null);
  const loginEmailRef = useRef(loginEmail);
  const signupEmailRef = useRef(signupEmail);
  const signupPhoneRef = useRef(signupPhone);
  const peekSpeechShownRef = useRef(false);
  const prevBusyRef = useRef(false);
  const prevActiveViewRef = useRef(activeView);
  const authErrorLockRef = useRef(false);

  useEffect(() => {
    loginEmailRef.current = loginEmail;
  }, [loginEmail]);

  useEffect(() => {
    signupEmailRef.current = signupEmail;
  }, [signupEmail]);

  useEffect(() => {
    signupPhoneRef.current = signupPhone;
  }, [signupPhone]);

  const clearSpeechTimer = useCallback(() => {
    if (speechTimerRef.current) {
      clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }
  }, []);

  const showSpeech = useCallback(
    (line: MascotSpeech, duration = SPEECH_MS) => {
      if (!line.text) return;
      setMascotSpeech(line);
      clearSpeechTimer();
      speechTimerRef.current = setTimeout(() => {
        setMascotSpeech(null);
        speechTimerRef.current = null;
      }, duration);
    },
    [clearSpeechTimer],
  );

  const speakRandom = useCallback(
    (lines: MascotSpeech[]) => {
      showSpeech(pickRandomLine(lines));
    },
    [showSpeech],
  );

  const speakAuthError = useCallback(
    (error: unknown) => {
      authErrorLockRef.current = true;
      clearSpeechTimer();
      const message = error instanceof Error ? error.message : String(error ?? '');
      showSpeech(mapAuthErrorToMascotSpeech(message, t), ERROR_SPEECH_MS);
      setTimeout(() => {
        authErrorLockRef.current = false;
      }, ERROR_SPEECH_MS);
    },
    [clearSpeechTimer, showSpeech, t],
  );

  const speakRegisterError = useCallback(
    (error: unknown) => {
      authErrorLockRef.current = true;
      clearSpeechTimer();
      const message = error instanceof Error ? error.message : String(error ?? '');
      showSpeech(mapRegisterErrorToMascotSpeech(message, t), ERROR_SPEECH_MS);
      setTimeout(() => {
        authErrorLockRef.current = false;
      }, ERROR_SPEECH_MS);
    },
    [clearSpeechTimer, showSpeech, t],
  );

  const speakGoogleUnavailable = useCallback(() => {
    speakRandom(getGoogleUnavailableLines(t));
  }, [speakRandom, t]);

  const speakForgotPasswordUnavailable = useCallback(() => {
    speakRandom(getForgotPasswordLines(t));
  }, [speakRandom, t]);

  const validateSignInForm = useCallback((): boolean => {
    const email = loginEmail.trim();
    if (!email) {
      speakRandom(getEmptyEmailLines(t));
      return false;
    }
    if (!isValidEmail(email)) {
      speakRandom(getInvalidEmailLines(t));
      return false;
    }
    if (loginPassword.length < 8) {
      speakRandom(getPasswordTooShortLines(t));
      return false;
    }
    return true;
  }, [loginEmail, loginPassword, speakRandom, t]);

  const validateSignUpForm = useCallback((): boolean => {
    const name = signupFullName.trim();
    if (name.length < 2 || name.length > 30) {
      speakRandom(getInvalidNameLines(t));
      return false;
    }
    const email = signupEmail.trim();
    if (!email) {
      speakRandom(getEmptyEmailLines(t));
      return false;
    }
    if (!isValidEmail(email)) {
      speakRandom(getInvalidEmailLines(t));
      return false;
    }
    if (!isValidPhone(signupPhone.trim())) {
      speakRandom(getInvalidPhoneLines(t));
      return false;
    }
    if (signupPassword.length < 8) {
      speakRandom(getPasswordTooShortLines(t));
      return false;
    }
    return true;
  }, [signupEmail, signupFullName, signupPassword, signupPhone, speakRandom, t]);

  const isPasswordFocused =
    focusedField === 'loginPassword' || focusedField === 'signupPassword';

  const lookX = useMemo(() => {
    if (focusedField === 'loginEmail') return emailLengthToLookX(loginEmail.length);
    if (focusedField === 'signupEmail') return emailLengthToLookX(signupEmail.length);
    if (focusedField === 'signupFullName') return emailLengthToLookX(signupFullName.length);
    if (focusedField === 'signupPhone') return emailLengthToLookX(signupPhone.length);
    return 0;
  }, [focusedField, loginEmail, signupEmail, signupFullName, signupPhone]);

  const clearPasswordTypingTimer = useCallback(() => {
    if (passwordTypingStopTimerRef.current) {
      clearTimeout(passwordTypingStopTimerRef.current);
      passwordTypingStopTimerRef.current = null;
    }
  }, []);

  const lookY = useMemo(
    () => (isPasswordFocused && isTypingPassword ? 6 : 0),
    [isPasswordFocused, isTypingPassword],
  );

  const eyeCover = useMemo((): EyeCoverMode => {
    if (isSigningIn || isSigningUp) return 'open';
    if (!isPasswordFocused) return 'open';
    if (isTypingPassword) return 'peek';
    return 'covered';
  }, [isPasswordFocused, isSigningIn, isSigningUp, isTypingPassword]);

  const handlePasswordFocus = useCallback(
    (field: 'loginPassword' | 'signupPassword') => {
      passwordFieldRef.current = field;
      setIsTypingPassword(false);
      peekSpeechShownRef.current = false;
      clearPasswordTypingTimer();
      showSpeech(pickRandomLine(getPasswordCoverLines(t)));
    },
    [clearPasswordTypingTimer, showSpeech, t],
  );

  const handlePasswordBlur = useCallback(() => {
    passwordFieldRef.current = null;
    setIsTypingPassword(false);
    peekSpeechShownRef.current = false;
    clearPasswordTypingTimer();
  }, [clearPasswordTypingTimer]);

  const handlePasswordChange = useCallback(
    (text: string, onChange: (value: string) => void) => {
      onChange(text);
      if (!passwordFieldRef.current) return;

      setIsTypingPassword(true);
      if (!peekSpeechShownRef.current) {
        peekSpeechShownRef.current = true;
        showSpeech(pickRandomLine(getPasswordPeekLines(t)), 3200);
      }

      clearPasswordTypingTimer();
      passwordTypingStopTimerRef.current = setTimeout(() => {
        setIsTypingPassword(false);
        passwordTypingStopTimerRef.current = null;
      }, PASSWORD_TYPING_PAUSE_MS);
    },
    [clearPasswordTypingTimer, showSpeech, t],
  );

  const validateEmail = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      if (!isValidEmail(trimmed)) {
        showSpeech(pickRandomLine(getInvalidEmailLines(t)));
      }
    },
    [showSpeech, t],
  );

  const validatePhone = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      if (!isValidPhone(trimmed)) {
        showSpeech(pickRandomLine(getInvalidPhoneLines(t)));
      }
    },
    [showSpeech, t],
  );

  const handleLoginEmailChange = useCallback(
    (text: string) => {
      loginEmailRef.current = text;
      if (emailValidateTimerRef.current) clearTimeout(emailValidateTimerRef.current);
      emailValidateTimerRef.current = setTimeout(() => {
        if (focusedField === 'loginEmail') validateEmail(text);
      }, EMAIL_VALIDATE_DEBOUNCE_MS);
    },
    [focusedField, validateEmail],
  );

  const handleSignupEmailChange = useCallback(
    (text: string) => {
      signupEmailRef.current = text;
      if (emailValidateTimerRef.current) clearTimeout(emailValidateTimerRef.current);
      emailValidateTimerRef.current = setTimeout(() => {
        if (focusedField === 'signupEmail') validateEmail(text);
      }, EMAIL_VALIDATE_DEBOUNCE_MS);
    },
    [focusedField, validateEmail],
  );

  const handleLoginEmailBlur = useCallback(() => {
    if (emailValidateTimerRef.current) clearTimeout(emailValidateTimerRef.current);
    validateEmail(loginEmailRef.current);
  }, [validateEmail]);

  const handleSignupEmailBlur = useCallback(() => {
    if (emailValidateTimerRef.current) clearTimeout(emailValidateTimerRef.current);
    validateEmail(signupEmailRef.current);
  }, [validateEmail]);

  const handleSignupPhoneBlur = useCallback(() => {
    validatePhone(signupPhoneRef.current);
  }, [validatePhone]);

  const handleLoginEmailFocus = useCallback(() => {
    showSpeech(pickRandomLine(getEmailFocusLines(t)), 3600);
  }, [showSpeech, t]);

  const handleSignupEmailFocus = useCallback(() => {
    showSpeech(pickRandomLine(getEmailFocusLines(t)), 3600);
  }, [showSpeech, t]);

  const handleSignupNameFocus = useCallback(() => {
    showSpeech(pickRandomLine(getSignupNameLines(t)), 3600);
  }, [showSpeech, t]);

  const handleSignupPhoneFocus = useCallback(() => {
    showSpeech(pickRandomLine(getSignupPhoneLines(t)), 3600);
  }, [showSpeech, t]);

  useEffect(() => {
    passwordFieldRef.current = isPasswordFocused ? focusedField : null;
    if (!isPasswordFocused) {
      setIsTypingPassword(false);
      peekSpeechShownRef.current = false;
    }
  }, [focusedField, isPasswordFocused]);

  useEffect(() => {
    if (prevActiveViewRef.current !== activeView) {
      prevActiveViewRef.current = activeView;
      const lines = activeView === 'signup' ? getSignupWelcomeLines(t) : getLoginWelcomeLines(t);
      showSpeech(pickRandomLine(lines), 3800);
    }
  }, [activeView, showSpeech, t]);

  useEffect(() => {
    const busy = isSigningIn || isSigningUp;
    if (busy && !prevBusyRef.current && !authErrorLockRef.current) {
      showSpeech(pickRandomLine(getBusyMascotLines(t)), 3600);
    }
    prevBusyRef.current = busy;
  }, [isSigningIn, isSigningUp, showSpeech, t]);

  useEffect(() => {
    const scheduleIdleLine = () => {
      randomIdleTimerRef.current = setTimeout(() => {
        const canSpeak =
          !isSigningIn &&
          !isSigningUp &&
          !isPasswordFocused &&
          focusedField !== 'loginEmail' &&
          focusedField !== 'signupEmail' &&
          focusedField !== 'signupPhone' &&
          focusedField !== 'signupFullName';

        if (canSpeak) {
          showSpeech(pickRandomLine(getIdleMascotLines(t)), 3600);
        }
        scheduleIdleLine();
      }, 16000 + Math.random() * 14000);
    };

    scheduleIdleLine();
    return () => {
      if (randomIdleTimerRef.current) clearTimeout(randomIdleTimerRef.current);
    };
  }, [activeView, focusedField, isPasswordFocused, isSigningIn, isSigningUp, showSpeech, t]);

  useEffect(
    () => () => {
      clearSpeechTimer();
      if (emailValidateTimerRef.current) clearTimeout(emailValidateTimerRef.current);
      clearPasswordTypingTimer();
      if (randomIdleTimerRef.current) clearTimeout(randomIdleTimerRef.current);
    },
    [clearPasswordTypingTimer, clearSpeechTimer],
  );

  return {
    mascotSpeech,
    lookX,
    lookY,
    eyeCover,
    speak: showSpeech,
    speakRandom,
    speakAuthError,
    speakRegisterError,
    speakGoogleUnavailable,
    speakForgotPasswordUnavailable,
    validateSignInForm,
    validateSignUpForm,
    handleLoginEmailChange,
    handleLoginEmailBlur,
    handleLoginEmailFocus,
    handleSignupEmailChange,
    handleSignupEmailBlur,
    handleSignupEmailFocus,
    handleSignupNameFocus,
    handleSignupPhoneFocus,
    handleSignupPhoneBlur,
    handlePasswordFocus,
    handlePasswordBlur,
    handlePasswordChange,
  };
}
