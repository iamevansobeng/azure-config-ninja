// scripts/index.ts
import * as dotenv from "dotenv";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import inquirer from "inquirer";
import { QuestionCollection } from "inquirer";

interface AzureConfig {
  appName: string;
  resourceGroup: string;
  environment: string;
  slot?: string;
}

interface StoredConfig extends AzureConfig {
  lastUsed: string;
}

class ConfigUploader {
  private readonly configPath = path.join(__dirname, "../.azure-config.json");

  private async loadStoredConfig(): Promise<StoredConfig | null> {
    try {
      if (fs.existsSync(this.configPath)) {
        const config = JSON.parse(fs.readFileSync(this.configPath, "utf8"));
        return config;
      }
    } catch (error) {
      console.log("No previous configuration found");
    }
    return null;
  }

  private saveConfig(config: AzureConfig): void {
    const storedConfig: StoredConfig = {
      ...config,
      lastUsed: new Date().toISOString(),
    };
    fs.writeFileSync(this.configPath, JSON.stringify(storedConfig, null, 2));
  }

  private async promptForConfiguration(
    storedConfig: StoredConfig | null
  ): Promise<AzureConfig> {
    if (storedConfig) {
      const questions: QuestionCollection = {
        type: "confirm",
        name: "useStored",
        message:
          `Use last configuration from ${new Date(
            storedConfig.lastUsed
          ).toLocaleString()}?\n` +
          `  App: ${storedConfig.appName}\n` +
          `  Resource Group: ${storedConfig.resourceGroup}\n` +
          `  Environment: ${storedConfig.environment}`,
        default: true,
      };

      const { useStored } = await inquirer.prompt<{ useStored: boolean }>(
        questions
      );

      if (useStored) {
        return storedConfig;
      }
    }

    // List available resource groups
    const resourceGroups = JSON.parse(
      execSync('az group list --query "[].name"', { encoding: "utf8" })
    );

    // List available web apps
    const webApps = JSON.parse(
      execSync('az webapp list --query "[].name"', { encoding: "utf8" })
    );

    const questions: QuestionCollection = [
      {
        type: "list",
        name: "resourceGroup",
        message: "Select the resource group:",
        choices: resourceGroups,
      },
      {
        type: "list",
        name: "appName",
        message: "Select the web app:",
        choices: webApps,
      },
      {
        type: "list",
        name: "environment",
        message: "Select the environment:",
        choices: ["production", "staging", "development"],
      },
    ];

    return await inquirer.prompt<AzureConfig>(questions);
  }

  private async getSlotSettings(config: AzureConfig): Promise<string[]> {
    if (config.environment === "production") {
      return [];
    }

    const defaultSlotSettings = ["NODE_ENV", "MONGODB_URI", "API_KEY"];

    const useDefaultQuestion: QuestionCollection = {
      type: "confirm",
      name: "useDefault",
      message: `Use default slot settings? (${defaultSlotSettings.join(", ")})`,
      default: true,
    };

    const { useDefault } = await inquirer.prompt<{ useDefault: boolean }>(
      useDefaultQuestion
    );

    if (useDefault) {
      return defaultSlotSettings;
    }

    const customSettingsQuestion: QuestionCollection = {
      type: "checkbox",
      name: "customSettings",
      message: "Select environment variables to mark as slot settings:",
      choices: Object.keys(dotenv.parse(fs.readFileSync(".env"))),
    };

    const { customSettings } = await inquirer.prompt<{
      customSettings: string[];
    }>(customSettingsQuestion);
    return customSettings;
  }

  private async confirmUpload(
    config: AzureConfig,
    envFile: string
  ): Promise<boolean> {
    // Show what will be uploaded
    const envContent = dotenv.parse(fs.readFileSync(envFile));
    console.log("\nConfiguration to be uploaded:");
    console.log("Environment:", config.environment);
    console.log("Variables:");
    Object.entries(envContent).forEach(([key, value]) => {
      console.log(`  ${key}: ${value.substring(0, 3)}${"*".repeat(5)}`);
    });

    const confirmQuestion: QuestionCollection = {
      type: "confirm",
      name: "confirm",
      message: "Proceed with upload?",
      default: false,
    };

    const { confirm } = await inquirer.prompt<{ confirm: boolean }>(
      confirmQuestion
    );
    return confirm;
  }

  public async upload(): Promise<void> {
    try {
      console.log("🔍 Checking Azure login status...");
      execSync("az account show", { stdio: "ignore" });
    } catch (error) {
      console.log("⚠️ Not logged in to Azure. Please login first.");
      execSync("az login", { stdio: "inherit" });
    }

    const storedConfig = await this.loadStoredConfig();
    const config = await this.promptForConfiguration(storedConfig);

    // Determine env file and slot
    const envFile =
      config.environment === "production"
        ? ".env"
        : `.env.${config.environment}`;
    const slot =
      config.environment === "production" ? undefined : config.environment;

    if (!fs.existsSync(envFile)) {
      console.error(`❌ Environment file ${envFile} not found!`);
      process.exit(1);
    }

    const slotSettings = await this.getSlotSettings(config);

    if (await this.confirmUpload(config, envFile)) {
      try {
        // Upload settings
        const envConfig = dotenv.parse(fs.readFileSync(envFile));
        const settings = Object.entries(envConfig)
          .map(([key, value]) => `${key}="${value}"`)
          .join(" ");

        console.log("📤 Uploading configuration...");

        // Update app settings
        execSync(
          `
          az webapp config appsettings set \
            --name ${config.appName} \
            --resource-group ${config.resourceGroup} \
            ${slot ? `--slot ${slot}` : ""} \
            --settings ${settings}
        `,
          { stdio: "inherit" }
        );

        // Mark slot settings if any
        if (slotSettings.length > 0) {
          execSync(
            `
            az webapp config appsettings set \
              --name ${config.appName} \
              --resource-group ${config.resourceGroup} \
              ${slot ? `--slot ${slot}` : ""} \
              --slot-settings ${slotSettings.join(" ")}
          `,
            { stdio: "inherit" }
          );
        }

        this.saveConfig(config);
        console.log("✅ Configuration uploaded successfully!");
      } catch (error) {
        console.error("❌ Failed to upload configuration:", error);
        process.exit(1);
      }
    } else {
      console.log("Upload cancelled");
    }
  }
}

// Run if called directly
if (require.main === module) {
  const uploader = new ConfigUploader();
  uploader.upload().catch(console.error);
}

export { ConfigUploader };
