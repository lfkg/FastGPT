import type { DatabaseConfig } from '@fastgpt/global/core/dataset/type';
import { AsyncDB } from './asyncDB';
import { DatabaseErrEnum } from '@fastgpt/global/common/error/code/database';
import { addLog } from '../../../../common/system/log';

export class PostgresqlClient extends AsyncDB {
  override async get_all_table_names(): Promise<Array<string>> {
    if (!this.db.isInitialized) {
      await this.db.initialize();
    }

    const queryRunner = this.db.createQueryRunner();

    try {
      const dbName = this.db.options.database;

      const schema = (this.config as any).schema || 'public';

      const tables: { table_name: string }[] = await queryRunner.query(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_catalog = $1
           AND table_schema = $2
           AND table_type = 'BASE TABLE'
         ORDER BY table_name`,
        [dbName, schema]
      );

      return tables.map((t) => t.table_name);
    } finally {
      await queryRunner.release();
    }
  }

  static fromConfig(config: DatabaseConfig): PostgresqlClient {
    const db = AsyncDB.from_uri(config);
    return new PostgresqlClient(db, config);
  }

  override async checkConnection(): Promise<boolean> {
    try {
      await super.checkConnection();
      return true;
    } catch (err: any) {
      addLog.warn('[PostgreSQL checkConnection]:', err);

      // PostgreSQL SQLSTATE error codes
      const code = err?.code;

      // Authentication errors (SQLSTATE Class 28)
      if (code === '28000' || code === '28P01') {
        // 28000: invalid_authorization_specification
        // 28P01: invalid_password
        return Promise.reject(DatabaseErrEnum.authError);
      }

      // Invalid database name (SQLSTATE 3D000)
      else if (code === '3D000') {
        // 3D000: invalid_catalog_name
        return Promise.reject(DatabaseErrEnum.databaseNameError);
      }

      // Connection errors (SQLSTATE Class 08)
      else if (code === '08006' || code === '08003' || code === '08001') {
        // 08006: connection_failure
        // 08003: connection_does_not_exist
        // 08001: sqlclient_unable_to_establish_sqlconnection
        return Promise.reject(DatabaseErrEnum.connectionLost);
      }

      // Node.js system-level errors (same as MySQL)
      else if (code === 'ECONNREFUSED') {
        // Connection refused - PostgreSQL server not running
        return Promise.reject(DatabaseErrEnum.econnRefused);
      } else if (code === 'ETIMEDOUT') {
        // Connection timeout - network issue or firewall
        return Promise.reject(DatabaseErrEnum.connectionTimeout);
      } else if (code === 'ENOTFOUND') {
        // Host not found - DNS resolution failure
        return Promise.reject(DatabaseErrEnum.connectionFailed);
      } else if (code === 'EHOSTUNREACH') {
        // Host unreachable - network routing issue
        return Promise.reject(DatabaseErrEnum.hostError);
      } else if (code === 'ERR_SOCKET_BAD_PORT') {
        // Invalid port number
        return Promise.reject(DatabaseErrEnum.databasePortError);
      }

      // Catch-all for unknown errors
      else {
        addLog.error('[PostgreSQL checkConnection] Unknown error:', {
          code,
          message: err?.message,
          detail: err?.detail
        });
        return Promise.reject(DatabaseErrEnum.checkError);
      }
    }
  }
}
