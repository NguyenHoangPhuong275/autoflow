import { useEffect, useState } from 'react';
import { APP_CONFIG } from '@/core/config';
import { GoogleSyncService } from '@/core/services/googleSyncService';
import { getErrorMessage } from '@/core/utils/errors';
export function useGoogleAuth(onLoginSuccess?: () => void) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clientId, setClientId] = useState(APP_CONFIG.googleClientId);
    const [userEmail, setUserEmail] = useState<string | null>(GoogleSyncService.getUserEmail());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        const restored = GoogleSyncService.getUserEmail();
        if (restored) {
            setUserEmail(restored);
            onLoginSuccess?.();
        }
    }, []);
    const performLogin = async (targetClientId: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await GoogleSyncService.loginWithGoogle(targetClientId);
            setUserEmail(result.email || 'Google User');
            onLoginSuccess?.();
            setIsModalOpen(false);
        }
        catch (error: unknown) {
            setError(getErrorMessage(error, 'Đăng nhập Google thất bại.'));
            setIsModalOpen(true);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleButtonClick = () => {
        const activeId = clientId.trim() || APP_CONFIG.googleClientId.trim();
        if (activeId)
            performLogin(activeId);
        else
            setIsModalOpen(true);
    };
    const handleLogout = () => {
        GoogleSyncService.logout();
        setUserEmail(null);
    };
    return {
        isModalOpen,
        setIsModalOpen,
        clientId,
        setClientId,
        userEmail,
        isLoading,
        error,
        performLogin,
        handleButtonClick,
        handleLogout,
    };
}
