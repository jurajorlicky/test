import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { FaArrowLeft, FaEdit, FaTrash, FaSignOutAlt } from 'react-icons/fa';

interface IProfile {
  first_name: string;
  last_name: string;
  ico: string;
  address: string;
  popisne_cislo: string;
  psc: string;
  mesto: string;
  krajina: string;
  email: string;
  telephone: string;
  iban: string; // Pridané pole pre IBAN
}

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');

  // Lokálny stav profilu
  const [profile, setProfile] = useState<IProfile>({
    first_name: '',
    last_name: '',
    ico: '',
    address: '',
    popisne_cislo: '',
    psc: '',
    mesto: '',
    krajina: 'Slovensko',
    email: '',
    telephone: '',
    iban: '', // Inicializácia IBAN
  });

  // Ovládanie modálneho okna
  const [showModal, setShowModal] = useState(false);

  // Stav pre chybové a úspešné hlásenia
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const getProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          navigate('/');
          return;
        }
        setUser(user);
        setEmail(user.email || '');

        // Načítanie profilu z DB
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setProfile({
            first_name: profileData.first_name || '',
            last_name: profileData.last_name || '',
            ico: profileData.ico || '',
            address: profileData.address || '',
            popisne_cislo: profileData.popisne_cislo || '',
            psc: profileData.psc || '',
            mesto: profileData.mesto || '',
            krajina: profileData.krajina || 'Slovensko',
            email: profileData.email || user.email,
            telephone: profileData.telephone || '',
            iban: profileData.iban || '', // Načítanie IBAN z DB
          });
        } else {
          // Ak profil neexistuje, nastavíme aspoň email
          setProfile((prev) => ({ ...prev, email: user.email || '' }));
        }

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Chyba pri načítavaní profilu:', profileError);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    getProfile();
  }, [navigate]);

  // Odhlásenie
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Otvorenie modálu (Upraviť profil)
  const handleOpenModal = () => {
    setShowModal(true);
    setError(null);
    setSuccessMessage(null);
  };

  // Zatvorenie modálu
  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Uloženie profilu (upsert)
  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Používateľ nie je prihlásený.');
        return;
      }

      const updates = {
        id: user.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        ico: profile.ico,
        address: profile.address,
        popisne_cislo: profile.popisne_cislo,
        psc: profile.psc,
        mesto: profile.mesto,
        krajina: profile.krajina,
        email: profile.email, // email je z Auth a ostáva nemenný
        telephone: profile.telephone,
        iban: profile.iban, // Uloženie IBAN
        updated_at: new Date(),
      };

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(updates);

      if (upsertError) {
        setError('Chyba pri ukladaní profilu: ' + upsertError.message);
        return;
      }

      setSuccessMessage('Profil bol úspešne uložený!');
      setShowModal(false);
    } catch (err: any) {
      setError('Neočakávaná chyba pri ukladaní profilu.');
      console.error(err);
    }
  };

  // Odstránenie profilu
  const handleDeleteProfile = async () => {
    const confirmDelete = window.confirm(
      'Naozaj chcete odstrániť svoj profil? Táto akcia je nezvratná.'
    );
    if (!confirmDelete) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError('Používateľ nie je prihlásený.');
        return;
      }

      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (deleteError) {
        setError('Chyba pri odstraňovaní profilu: ' + deleteError.message);
        return;
      }

      // Vynulujeme lokálny profil
      setProfile({
        first_name: '',
        last_name: '',
        ico: '',
        address: '',
        popisne_cislo: '',
        psc: '',
        mesto: '',
        krajina: 'Slovensko',
        email: user.email || '',
        telephone: '',
        iban: '', // Reset IBAN
      });

      setSuccessMessage('Profil bol úspešne odstránený.');
    } catch (error: any) {
      setError('Neočakávaná chyba pri odstraňovaní profilu.');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl text-gray-600">Načítava sa...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-black to-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Link
              to="/dashboard"
              className="flex items-center text-white hover:text-gray-200 transition duration-300"
            >
              <FaArrowLeft className="mr-2" />
              <span>Späť na Dashboard</span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition duration-300 flex items-center"
            >
              <FaSignOutAlt className="mr-2" />
              Odhlásiť sa
            </button>
          </div>
        </div>
      </header>

      {/* 1. BOX - Účet */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-2xl leading-6 font-bold text-gray-900">
              Účet
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {email}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  Účet vytvorený
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {new Date(user?.created_at).toLocaleDateString('sk-SK')}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  ID používateľa
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {user?.id}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* 2. BOX - Osobné informácie */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-2xl leading-6 font-bold text-gray-900">
              Osobné informácie
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={handleOpenModal}
                className="flex items-center px-3 py-2 text-sm font-semibold text-white bg-black rounded hover:bg-gray-800 transition duration-300"
              >
                <FaEdit className="mr-2" />
                Upraviť
              </button>
              <button
                onClick={handleDeleteProfile}
                className="flex items-center px-3 py-2 text-sm font-semibold text-white bg-red-600 rounded hover:bg-red-700"
              >
                <FaTrash className="mr-2" />
                Odstrániť
              </button>
            </div>
          </div>

          {error && (
            <div className="px-4 py-2 text-red-600 bg-red-50">{error}</div>
          )}
          {successMessage && (
            <div className="px-4 py-2 text-green-600 bg-green-50">
              {successMessage}
            </div>
          )}

          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Meno</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {profile.first_name || '—'}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Priezvisko</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {profile.last_name || '—'}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">IČO</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {profile.ico || '—'}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Adresa</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {profile.address || '—'} {profile.popisne_cislo || ''}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">PSČ</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {profile.psc || '—'}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Mesto</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {profile.mesto || '—'}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Krajina</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {profile.krajina || '—'}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Telefón</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {profile.telephone || '—'}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">IBAN</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {profile.iban || '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* MODÁLNE OKNO - Upraviť profil */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-2xl relative">
            <h2 className="text-2xl font-bold mb-4">Upraviť profil</h2>

            {error && (
              <div className="bg-red-50 text-red-600 p-2 mb-4">{error}</div>
            )}
            {successMessage && (
              <div className="bg-green-50 text-green-600 p-2 mb-4">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmitProfile}>
              {/* 1. Riadok: Meno / Priezvisko */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="first_name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Meno
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    value={profile.first_name}
                    onChange={(e) =>
                      setProfile({ ...profile, first_name: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="last_name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Priezvisko
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    value={profile.last_name}
                    onChange={(e) =>
                      setProfile({ ...profile, last_name: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    required
                  />
                </div>
              </div>

              {/* 2. Riadok: Adresa / Popisné číslo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label
                    htmlFor="address"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Adresa
                  </label>
                  <input
                    type="text"
                    id="address"
                    value={profile.address}
                    onChange={(e) =>
                      setProfile({ ...profile, address: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="popisne_cislo"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Popisné číslo
                  </label>
                  <input
                    type="text"
                    id="popisne_cislo"
                    value={profile.popisne_cislo}
                    onChange={(e) =>
                      setProfile({ ...profile, popisne_cislo: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    required
                  />
                </div>
              </div>

              {/* 3. Riadok: PSČ / Mesto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label
                    htmlFor="psc"
                    className="block text-sm font-medium text-gray-700"
                  >
                    PSČ
                  </label>
                  <input
                    type="text"
                    id="psc"
                    value={profile.psc}
                    onChange={(e) =>
                      setProfile({ ...profile, psc: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    required
                  />
                </div>
                <div>
                  <label
                    htmlFor="mesto"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Mesto
                  </label>
                  <input
                    type="text"
                    id="mesto"
                    value={profile.mesto}
                    onChange={(e) =>
                      setProfile({ ...profile, mesto: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    required
                  />
                </div>
              </div>

              {/* 4. Riadok: IČO / Krajina */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label
                    htmlFor="ico"
                    className="block text-sm font-medium text-gray-700"
                  >
                    IČO (voliteľné)
                  </label>
                  <input
                    type="text"
                    id="ico"
                    value={profile.ico}
                    onChange={(e) =>
                      setProfile({ ...profile, ico: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="krajina"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Krajina
                  </label>
                  <select
                    id="krajina"
                    value={profile.krajina}
                    onChange={(e) =>
                      setProfile({ ...profile, krajina: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    required
                  >
                    <option value="Slovensko">Slovensko</option>
                    <option value="Ceska Republika">Česká Republika</option>
                    <option value="Madarsko">Maďarsko</option>
                    <option value="Rumunsko">Rumunsko</option>
                  </select>
                </div>
              </div>

              {/* 5. Riadok: Email / Telefón */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={profile.email}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="telephone"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Telefónne číslo
                  </label>
                  <input
                    type="text"
                    id="telephone"
                    value={profile.telephone}
                    onChange={(e) =>
                      setProfile({ ...profile, telephone: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
              </div>

              {/* 6. Riadok: IBAN */}
              <div className="grid grid-cols-1 mt-4">
                <div>
                  <label
                    htmlFor="iban"
                    className="block text-sm font-medium text-gray-700"
                  >
                    IBAN
                  </label>
                  <input
                    type="text"
                    id="iban"
                    value={profile.iban}
                    onChange={(e) =>
                      setProfile({ ...profile, iban: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
              </div>

              {/* Tlačidlá vo formulári */}
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400"
                >
                  Zrušiť
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
                >
                  Uložiť
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
