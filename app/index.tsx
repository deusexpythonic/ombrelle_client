import 'react-native-get-random-values';
import React, { useState, useRef } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { PublicKey, TransactionInstruction, SystemProgram, Connection, clusterApiUrl, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol';
import { Buffer } from 'buffer';
import { hash } from 'fast-sha256';
        
global.Buffer = global.Buffer || Buffer;

export default function App() {
  const [history, setHistory] = useState([
    "==================================================",
    " OMBRELLE CORE // CLOCK IN (SEEKER HARDWARE MODE)",
    " INVARIANTS: NO IDENTITY. SEED VAULT ONLY.",
    "==================================================",
    " "
  ]);
  const [input, setInput] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
    
  const appendHistory = (msg: string) => {
    setHistory(prev => [...prev, msg]);
  };
   
  const handleCommand = async () => {
    if (!input.trim()) return;
        
    const secretInput = input.trim();
    appendHistory(`> INJECT SECRET: ${'*'.repeat(secretInput.length)}`);
    setInput(''); 
    appendHistory("[>] Établissement du canal...");
            
    try {
      const PROGRAM_ID = new PublicKey("GBUBpHatnT5rkhYcCD7MGrq2FFhT3fC7upVeUUbf9uU2");
          
      // 1. Mathématiques : Hachage Cypherpunk pur et unifié (0 dépendance)
      const secretBuffer = new TextEncoder().encode(secretInput);
      const secretHash = hash(secretBuffer);
            
      // Dérivation stricte correspondant au "seeds = [secret_hash.as_ref()]" de Rust
      const [pdaAddress] = PublicKey.findProgramAddressSync([Buffer.from(secretHash)], PROGRAM_ID);

      appendHistory(`[>] Cible PDA dérivée : ${pdaAddress.toBase58()}`);
      appendHistory("[>] Réveil du Seed Vault (Hardware Enclave)...");

      // 2. Pont Matériel : Forcer la signature biométrique
      await transact(async (wallet) => {
        // A. Poignée de main
        const authResult = await wallet.authorize({
          cluster: 'devnet',
          identity: { name: 'Ombrelle Terminal (Null)' }
        });
        
        const userAccount = authResult.accounts[0];
        const userPubkey = new PublicKey(Buffer.from(userAccount.address, 'base64'));
        appendHistory(`[!] IDENTITÉ SYSTÈME : ${userPubkey.toBase58().substring(0,8)}...`);

        // B. Construction de l'Ordalie (Transaction Aveugle)
        
        // Calcul brutal du discriminateur Anchor pour la fonction "clock_in"
        const discriminator = hash(new TextEncoder().encode("global:clock_in")).slice(0, 8);
        
        // Les données envoyées : Discriminateur (8 octets) + Secret Hash (32 octets)
        const ixData = Buffer.concat([Buffer.from(discriminator), Buffer.from(secretHash)]);

        const instruction = new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: pdaAddress, isSigner: false, isWritable: true },
            { pubkey: userPubkey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          data: ixData
        });

        // Connexion réseau pour récupérer le bloc actuel
        const connection = new Connection(clusterApiUrl('devnet'));
        const latestBlockhash = await connection.getLatestBlockhash();

        // 1. L'Architecture Moderne : TransactionMessage (v0)
        const messageV0 = new TransactionMessage({
          payerKey: userPubkey,
          recentBlockhash: latestBlockhash.blockhash,
          instructions: [instruction],
        }).compileToV0Message();

        const transaction = new VersionedTransaction(messageV0);
        
        // 2. Sérialisation et Encodage Base64 strict pour le protocole matériel
        const wireTransaction = transaction.serialize(); // Génère le Uint8Array
        const base64Payload = Buffer.from(wireTransaction).toString('base64'); // Traduction pour le Seed Vault

        appendHistory("[!] DÉCLENCHEMENT MATÉRIEL. ATTENTE DE BIOMÉTRIE...");

        // 3. L'Appel au Capteur : Le mot-clé exact et la chaîne de texte Base64
        const signResult = await wallet.signAndSendTransactions({
          payloads: [base64Payload]
        });

        appendHistory(`\n[+] CLOCK IN VALIDÉ. MONUMENT GRAVÉ.`);
        
        // Le Seed Vault nous renvoie les signatures sous forme de tableau d'octets, on le repasse en Base64 pour l'affichage
        const signatureBase64 = Buffer.from(signResult.signatures[0]).toString('base64');
        appendHistory(`[+] SIGNATURE : ${signatureBase64.substring(0,16)}...`);
        appendHistory("[+] EXIT.");
      });

    } catch (e: any) {
      appendHistory(`[-] ERREUR SEED VAULT : ${e.message || "REJETÉ."}`);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView 
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        style={styles.terminal}
      >
        {history.map((line, index) => (
          <Text key={index} style={styles.text}>{line}</Text>
        ))}
        <View style={styles.inputRow}>
          <Text style={styles.prompt}>{'> '}</Text>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleCommand}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardAppearance="dark"
            secureTextEntry={true}
            autoFocus={true}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  terminal: { flex: 1, padding: 15, paddingTop: 40 },
  text: { color: '#00FF00', fontFamily: 'monospace', fontSize: 13, marginBottom: 5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingBottom: 60 },
  prompt: { color: '#00FF00', fontFamily: 'monospace', fontSize: 13 },
  input: { flex: 1, color: '#00FF00', fontFamily: 'monospace', fontSize: 13, padding: 0, margin: 0 }
});
