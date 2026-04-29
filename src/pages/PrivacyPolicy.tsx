const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="container max-w-3xl mx-auto">
        <h1 className="font-heading text-3xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-4">This Privacy Policy explains how AccessAble collects, uses, and shares information. Placeholder content—replace with your official policy text.</p>
        <section className="mb-4">
          <h2 className="font-semibold">Information We Collect</h2>
          <p className="text-muted-foreground">We collect information provided by users and usage data to improve the platform.</p>
        </section>
        <section className="mb-4">
          <h2 className="font-semibold">How We Use Data</h2>
          <p className="text-muted-foreground">Data is used to provide services, communicate with users, and comply with legal obligations.</p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
