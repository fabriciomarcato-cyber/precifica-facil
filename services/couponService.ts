import { db, auth } from '../firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp, 
  Timestamp,
  getDocFromServer,
  collection,
  query,
  where,
  getDocs,
  limit
} from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function activateCoupon(code: string) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Você precisa estar logado para ativar um cupom.');
  }

  const couponId = code.toUpperCase().trim();
  const couponRef = doc(db, 'coupons', couponId);

  try {
    const couponSnap = await getDoc(couponRef);
    if (!couponSnap.exists()) {
      throw new Error('Cupom inválido ou não encontrado.');
    }

    const data = couponSnap.data();
    
    // Suporta tanto o formato antigo quanto o novo solicitado pelo usuário
    const currentStatus = data.status;
    
    if (currentStatus === 'usado' || currentStatus === 'used') {
      throw new Error('Este cupom já foi utilizado.');
    }

    if (currentStatus !== 'disponivel' && currentStatus !== 'available' && currentStatus !== undefined) {
       // Se houver um status diferente de disponivel/available, podemos considerar inválido ou apenas prosseguir se for nulo
    }

    // Lógica de 1 ano (365 dias)
    const now = new Date();
    const expirationDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    await updateDoc(couponRef, {
      status: 'usado',
      used_by_uid: user.uid,
      data_ativacao: serverTimestamp(),
      data_vencimento: Timestamp.fromDate(expirationDate),
      codigo: couponId,
      // Mantendo compatibilidade com campos antigos se necessário
      activation_date: serverTimestamp(),
      expiration_date: Timestamp.fromDate(expirationDate)
    });

    return {
      success: true,
      expirationDate
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `coupons/${couponId}`);
    return { success: false };
  }
}

/**
 * Verifica se o e-mail do usuário logado possui acesso liberado na coleção /coupons.
 * Se o status for 'disponivel', ativa automaticamente por 1 ano.
 * Se já for 'usado', verifica se ainda está dentro do prazo de validade.
 */
export async function checkAndActivateEmailAccess() {
  const user = auth.currentUser;
  if (!user || !user.email) return null;

  const email = user.email.toLowerCase().trim();
  const couponRef = doc(db, 'coupons', email);

  try {
    const couponSnap = await getDoc(couponRef);
    if (!couponSnap.exists()) {
      return null;
    }

    const data = couponSnap.data();
    const now = new Date();

    // Se o cupom está disponível, ativa ele agora
    if (data.status === 'disponivel' || data.status === 'available') {
      const expirationDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      
      await updateDoc(couponRef, {
        status: 'usado',
        used_by_uid: user.uid,
        data_ativacao: serverTimestamp(),
        data_vencimento: Timestamp.fromDate(expirationDate),
        codigo: email // Garante que o campo codigo contenha o email conforme solicitado
      });
      
      return expirationDate;
    }

    // Se já está usado, verifica a validade
    if (data.status === 'usado' || data.status === 'used') {
      const expirationDate = (data.data_vencimento || data.expiration_date)?.toDate();
      if (expirationDate && expirationDate > now) {
        // Se o used_by_uid estiver vazio ou for diferente (caso de re-login ou ativação manual), vincula ao UID atual
        if (!data.used_by_uid || data.used_by_uid !== user.uid) {
          await updateDoc(couponRef, { used_by_uid: user.uid });
        }
        return expirationDate;
      }
    }

    return null;
  } catch (error) {
    console.error("Erro ao verificar acesso por e-mail:", error);
    return null;
  }
}

/**
 * Funções Administrativas (Apenas para Admin)
 */

export async function listAllCoupons() {
  try {
    const couponsRef = collection(db, 'coupons');
    const querySnapshot = await getDocs(couponsRef);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error("Erro ao listar cupons:", error);
    throw error;
  }
}

export async function addAdminCoupon(email: string) {
  const cleanEmail = email.toLowerCase().trim();
  const couponRef = doc(db, 'coupons', cleanEmail);
  
  try {
    await updateDoc(couponRef, {
      codigo: cleanEmail,
      status: 'disponivel',
      criado_em: serverTimestamp()
    });
  } catch (error: any) {
    // Se o documento não existir, o updateDoc falha. Usamos setDoc como fallback ou principal.
    const { setDoc } = await import('firebase/firestore');
    await setDoc(couponRef, {
      codigo: cleanEmail,
      status: 'disponivel',
      criado_em: serverTimestamp()
    });
  }
}

export async function deleteCoupon(id: string) {
  const { deleteDoc } = await import('firebase/firestore');
  const couponRef = doc(db, 'coupons', id);
  try {
    await deleteDoc(couponRef);
  } catch (error) {
    console.error("Erro ao deletar cupom:", error);
    throw error;
  }
}

export async function checkActiveCoupon() {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const couponsRef = collection(db, 'coupons');
    const q = query(
      couponsRef, 
      where('used_by_uid', '==', user.uid),
      where('status', '==', 'usado'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const couponData = querySnapshot.docs[0].data();
      // Tenta pegar do novo campo data_vencimento ou do antigo expiration_date
      const expirationDate = (couponData.data_vencimento || couponData.expiration_date)?.toDate();
      
      if (expirationDate && expirationDate > new Date()) {
        return expirationDate;
      }
    }
    
    // Fallback para o status antigo 'used'
    const qOld = query(
      couponsRef, 
      where('used_by_uid', '==', user.uid),
      where('status', '==', 'used'),
      limit(1)
    );
    const querySnapshotOld = await getDocs(qOld);
    if (!querySnapshotOld.empty) {
      const couponData = querySnapshotOld.docs[0].data();
      const expirationDate = (couponData.data_vencimento || couponData.expiration_date)?.toDate();
      if (expirationDate && expirationDate > new Date()) {
        return expirationDate;
      }
    }

    return null;
  } catch (error) {
    console.error("Erro ao verificar cupom ativo:", error);
    return null;
  }
}

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
